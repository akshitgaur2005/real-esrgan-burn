use burn::prelude::*;
use burn::{
    tensor::{TensorData, Shape, Tensor, ElementConversion},
};
use std::path::Path;
use image::{ImageReader, ImageFormat, RgbImage, Luma, ImageBuffer}; // Import necessary items from image crate
use std::error::Error; // For generic error handling

pub fn pad_reflect<B: Backend>(
    og_image: Tensor<B, 3>,
    pad_size: usize,
    device: &B::Device,
) -> Tensor<B, 3> {
    let shape = og_image.dims();
    let channels = shape[0];
    let height = shape[1];
    let width = shape[2];

    if pad_size == 0 {
        return og_image;
    }

    let new_height = height + pad_size * 2;
    let new_width = width + pad_size * 2;

    let height_mul = new_height / height;
    let width_mul = new_width / width;

    let image = Tensor::cat(vec![og_image.clone(); height_mul], 1);
    let image = Tensor::cat(vec![image; width_mul], 2);

    let new_shape = Shape::new([channels, new_height, new_width]);

    let mut new_image = Tensor::<B, 3>::zeros(new_shape, device);

    // Step 1 - Copy existing image to the center
    let center_slice = [
        0..channels,
        pad_size..height + pad_size,
        pad_size..width + pad_size,
    ];
    new_image = new_image.slice_assign(center_slice, og_image.clone());

    // Step 2 - Pad top, along height axis
    // Get top rows from original
    let top_original = image
        .clone()
        .slice([0..channels, 1..pad_size + 1, 0..width]);

    let top_flipped = top_original.flip([1]);

    let top_target = [0..channels, 0..pad_size, pad_size..width + pad_size];

    new_image = new_image.slice_assign(top_target, top_flipped);

    // Step 3 - Pad bottom
    let bottom_original = image.slice([
        0..channels,
        height - pad_size - 1..height - 1,
        0..width,
    ]);

    let bottom_flipped = bottom_original.flip([1]);

    let bottom_target = [
        0..channels,
        height + pad_size..new_height,
        pad_size..width + pad_size,
    ];

    new_image = new_image.slice_assign(bottom_target, bottom_flipped);

    // Step 4 - Pad Left
    // We will now use partially filled new_image as the source too
    let left_source =
        new_image
            .clone()
            .slice([0..channels, 0..new_height, pad_size + 1..pad_size * 2 + 1]);

    let left_flipped = left_source.flip([2]);

    let left_target = [0..channels, 0..new_height, 0..pad_size];

    new_image = new_image.slice_assign(left_target, left_flipped);

    // Step 5 - Pad Right
    let right_source = new_image.clone().slice([
        0..channels,
        0..new_height,
        new_width - 1 - pad_size * 2..new_width - pad_size - 1,
    ]);

    let right_flipped = right_source.flip([2]);

    let right_target = [0..channels, 0..new_height, new_width - pad_size..new_width];

    new_image = new_image.slice_assign(right_target, right_flipped);

    new_image
}

pub fn pad_edge<B: Backend>(image: Tensor<B, 3>, pad_size: usize) -> Tensor<B, 3> {
    let [channels, height, width] = image.dims();

    let new_height = height + 2 * pad_size;

    let top = image.clone().slice([0..channels, 0..1, 0..width]);

    let mut top_done = vec![top; pad_size];
    top_done.push(image.clone());

    let mut final_image = Tensor::<B, 3>::cat(top_done, 1);

    let bottom = image
        .clone()
        .slice([0..channels, height - 1..height, 0..width]);

    let mut bot_done = vec![final_image.clone()];
    bot_done.extend(vec![bottom; pad_size]);

    final_image = Tensor::<B, 3>::cat(bot_done, 1);

    let left = final_image
        .clone()
        .slice([0..channels, 0..new_height, 0..1]);

    let mut left_done = vec![left; pad_size];
    left_done.push(final_image.clone());

    final_image = Tensor::<B, 3>::cat(left_done, 2);

    let right = final_image.clone().slice([
        0..channels,
        0..new_height,
        width + pad_size - 1..width + pad_size,
    ]);

    let mut right_done = vec![final_image.clone()];
    right_done.extend(vec![right; pad_size]);

    final_image = Tensor::<B, 3>::cat(right_done, 2);

    final_image
}

pub fn split_image_into_overlapping_patches<B: Backend>(
    image: Tensor<B, 3>,
    patch_size: usize,
    padding_size: usize,
) -> (Tensor<B, 4>, [usize; 3]) {
    let [channels, xmax, ymax] = image.dims();

    let x_rem = xmax % patch_size;
    let y_rem = ymax % patch_size;

    let x_extend = (patch_size - x_rem) % patch_size;
    let y_extend = (patch_size - y_rem) % patch_size;

    let pad_size = std::cmp::max(x_extend, y_extend);

    // Pad edge of the image in only bottom and right by x_extend and y_extend
    let extended_image = pad_edge(image, pad_size);
    let extended_image = extended_image.slice([
        0..channels,
        pad_size..xmax + x_extend + pad_size,
        pad_size..ymax + y_extend + pad_size,
    ]);

    // Using pad_edge in place of pad_patch(channel_last=True)
    let padded_image = pad_edge(extended_image, padding_size);

    let [channels, xmax, ymax] = padded_image.dims();

    println!("split -> padded_image_dims: {:?}", padded_image.dims());
    let mut patches = Vec::new();

    let x_lefts = (padding_size..(xmax - padding_size)).step_by(patch_size);
    let y_tops = (padding_size..(ymax - padding_size)).step_by(patch_size);
    println!("split -> padded_image_dims: {:?}", x_lefts);

    for x in x_lefts {
        for y in y_tops.clone() {
            let x_left = x - padding_size;
            let y_top = y - padding_size;
            let x_right = x + patch_size + padding_size;
            let y_bottom = y + patch_size + padding_size;

            let patch = padded_image
                .clone()
                .slice([0..channels, x_left..x_right, y_top..y_bottom]);

            let final_patch: Tensor<B, 4> = patch.unsqueeze();
            patches.push(final_patch);
        }
    }

    println!("split -> patches: {}", patches[0]);
    let final_output = Tensor::cat(patches, 0);

    (final_output, padded_image.dims())
}

fn unpad_patches<B: Backend>(image_patches: Tensor<B, 4>, padding_size: usize) -> Tensor<B, 4> {
    let [num_patch, channels, height, width] = image_patches.dims();
    image_patches.slice([
        0..num_patch,
        0..channels,
        padding_size..height - padding_size,
        padding_size..width - padding_size,
    ])
}

pub fn stitch_together<B: Backend>(
    image_patches: Tensor<B, 4>,
    padded_image_shape: [usize; 3],
    target_shape: [usize; 2],
    padding_size: usize,
    device: &B::Device,
) -> Tensor<B, 3> {
    let [channels, xmax, ymax] = padded_image_shape;
    let patches = unpad_patches(image_patches, padding_size);
    let patch_size = patches.dims()[2];

    let n_patches_per_row: usize = (ymax - 2 * padding_size) / patch_size;

    let mut complete_image = Tensor::zeros(Shape::new([channels, xmax, ymax]), device);

    println!("Patches: {:?}", patches.dims());
    for i in 0..patches.dims()[0] {
        // Calculate row and column index
        let x_idx = i / n_patches_per_row;
        let y_idx = i % n_patches_per_row;

        // Get current patch
        let current_patch = patches.clone().slice([i..i + 1]);
        let current_patch = current_patch.squeeze(0);

        // Define the slice within the complete_image where the current_patch should be placed
        let row_start = padding_size + x_idx * patch_size;
        let row_end = row_start + patch_size;
        let col_start = padding_size + y_idx * patch_size;
        let col_end = col_start + patch_size;

        println!("i: {i}, row_start: {row_start}, end: {row_end}");
        // Assign the patch
        complete_image = complete_image.slice_assign(
            [0..channels, row_start..row_end, col_start..col_end],
            current_patch,
        );
    }

    let target_height = target_shape[0];
    let target_width = target_shape[1];

    println!("padd_size: {padding_size}..{target_height} + {padding_size}");
    let final_image = complete_image.slice([
        0..channels,
        padding_size..target_height + padding_size,
        padding_size..target_width + padding_size,
    ]);

    final_image
}

pub fn unpad_image<B: Backend>(image: Tensor<B, 3>, pad_size: usize) -> Tensor<B, 3> {
    let [channels, height, width] = image.dims();
    image.slice([
        0..channels,
        pad_size..height - pad_size,
        pad_size..width - pad_size
    ])
}

/// Loads an image from a file path and converts it into a Tensor<B, 4>.
/// The tensor will have shape [1, Channels, Height, Width] and float values in [0, 1].
/// Supports image formats supported by the 'image' crate (PNG, JPEG, etc. with enabled features).
/// Converts input to RGB if it's not already (discards alpha if present).
///
/// Args:
///     path: The path to the image file.
///     device: The Burn device to create the tensor on.
///
/// Returns:
///     A Result containing the loaded tensor or an error.
pub fn load_image_to_tensor<B: Backend, P: AsRef<Path>>(
    path: P,
    device: &B::Device,
) -> Result<Tensor<B, 3>, Box<dyn Error>> {
    // Open and decode the image file
    let img = ImageReader::open(path)?.decode()?;

    // Convert to RGB8 format (3 channels, 8 bits per channel)
    // This handles different input formats (grayscale, rgba) and converts to RGB
    let rgb_img = img.to_rgb8();
    let (width, height) = rgb_img.dimensions();
    let channels = 3; // RGB always has 3 channels

    // Get the raw pixel bytes (HWC order by default from image crate)
    let raw_pixels: Vec<u8> = rgb_img.into_raw();

    // Convert u8 pixel values [0, 255] to float [0, 1] and reorder to CHW
    /*
    let mut data_chw: Vec<B::FloatElem> = Vec::with_capacity(height as usize * width as usize * channels);
    for c in 0..channels {
        for h in 0..height as usize {
            for w in 0..width as usize {
                // Calculate index in the HWC raw_pixels buffer
                let hwc_idx = h * (width as usize * channels) + w * channels + c;
                let pixel_value_u8 = raw_pixels[hwc_idx];
                // Convert u8 [0, 255] to float [0.0, 1.0] and convert to backend float type
                data_chw.push((pixel_value_u8 as f32).elem());
            }
        }
    }


    // Create a Tensor<B, 3> [Channels, Height, Width] first
    let tensor_3d = Tensor::<B, 3>::from_data(
        TensorData::new(data_chw, Shape::new([channels, height as usize, width as usize])),
        device,
    );
     */

    let tensor_3d = Tensor::<B, 3>::from_data(
        TensorData::new(raw_pixels, Shape::new([height as usize, width as usize, channels])), &device);
    println!("Shape before permuting: {:?}", tensor_3d.dims());
    let tensor_3d = tensor_3d.permute([2, 0, 1]);
    println!("Shape after permuting: {:?}", tensor_3d.dims());

    Ok(tensor_3d)
}

/// Saves a Tensor<B, 4> to an image file.
/// Assumes the tensor has shape [1, Channels, Height, Width] and float values in [0, 1].
/// Supports saving in PNG format (or others with enabled features).
/// Handles 1-channel (grayscale) and 3-channel (RGB) tensors.
///
/// Args:
///     tensor: The tensor to save. Must have batch size 1.
///     path: The path to save the image file to.
///
/// Returns:
///     A Result indicating success or an error.
pub fn save_tensor_to_image<B: Backend, P: AsRef<Path>>(
    tensor: &Tensor<B, 3>,
    path: P,
) -> Result<(), Box<dyn Error>> {
    let [channels, height, width] = tensor.dims();

    // Un-normalize float [0, 1] to float [0, 255], convert to u8 [0, 255], and get raw data
    // clamp(0.0, 255.0) is important before casting to u8 to avoid overflow/underflow
    let data_hwc: Vec<u8> = tensor
        .clone() // Clone to avoid consuming the input tensor if needed elsewhere
        .permute([2, 0, 1])
        .into_data() // Move data to CPU Data struct
        .convert::<u8>() // Convert data type to u8
        .into_vec()
        .expect("Should have become a vec!"); // Get raw Vec<u8> (data is typically NCHW flattened from Burn)

        // Create an RgbImage buffer from the HWC data
        let img: RgbImage = ImageBuffer::from_raw(width as u32, height as u32, data_hwc)
            .ok_or_else(|| Box::<dyn Error>::from("Failed to create RgbImage buffer from tensor data"))?;

        // Save the image
        img.save_with_format(path, ImageFormat::Png)?; // Save as PNG

    Ok(())
}

// Tests
#[cfg(test)]
mod tests {
    use burn::backend::{Wgpu, wgpu::WgpuDevice};

    use super::*;
    type Back = Wgpu<f32, i32>;

    #[test]
    fn test_pad_reflect() {
        let device = WgpuDevice::default();

        let image = Tensor::<Back, 3>::from_floats([[[1., 2., 3.], [4., 5., 6.]]], &device);

        let pad_size = 1;
        println!("Original Shape: {:?}", image.dims());
        let padded_image = pad_reflect(image.clone(), pad_size, &device);

        let expected_shape = [1, 2 + 2 * pad_size, 3 + 2 * pad_size];

        println!("Padded Shape: {:?}", padded_image.dims());
        println!("Padded Image Data: {}", padded_image);

        let expected_data = TensorData::from([[
            [5., 4., 5., 6., 5.],
            [2., 1., 2., 3., 2.],
            [5., 4., 5., 6., 5.],
            [2., 1., 2., 3., 2.],
        ]]);

        assert_eq!(padded_image.dims(), expected_shape);
        padded_image.to_data().assert_approx_eq(&expected_data, 3); // Use approx_eq for float comparison
    }

    #[test]
    fn test_pad_edge() {
        let device = WgpuDevice::default();

        let image = Tensor::<Back, 3>::from_floats([[[1., 2., 3.], [4., 5., 6.]]], &device);

        let pad_size = 1;
        let padded_image = pad_edge(image.clone(), pad_size);

        let expected_shape = [1, 2 + 2 * pad_size, 3 + 2 * pad_size];

        println!("Original Shape: {:?}", image.dims());
        println!("Padded Shape: {:?}", padded_image.dims());
        println!("Padded Image Data: {}", padded_image);

        let expected_data = TensorData::from([[
            [1., 1., 2., 3., 3.],
            [1., 1., 2., 3., 3.],
            [4., 4., 5., 6., 6.],
            [4., 4., 5., 6., 6.],
        ]]);

        assert_eq!(padded_image.dims(), expected_shape);
        padded_image.to_data().assert_approx_eq(&expected_data, 3); // Use approx_eq for float comparison
    }

    #[test]
    fn test_split() {
        let device = WgpuDevice::default();

        let image =
            Tensor::<Back, 3>::from_floats([[[1., 2., 3.], [4., 5., 6.], [7., 8., 9.]]], &device);

        let (output, _) = split_image_into_overlapping_patches(image, 2, 2);

        println!("Final: {output}");
        let expected_data = TensorData::from([
            [[
                [1.0, 1.0, 1.0, 2.0, 3.0, 3.0],
                [1.0, 1.0, 1.0, 2.0, 3.0, 3.0],
                [1.0, 1.0, 1.0, 2.0, 3.0, 3.0],
                [4.0, 4.0, 4.0, 5.0, 6.0, 6.0],
                [7.0, 7.0, 7.0, 8.0, 9.0, 9.0],
                [7.0, 7.0, 7.0, 8.0, 9.0, 9.0],
            ]],
            [[
                [1.0, 2.0, 3.0, 3.0, 3.0, 3.0],
                [1.0, 2.0, 3.0, 3.0, 3.0, 3.0],
                [1.0, 2.0, 3.0, 3.0, 3.0, 3.0],
                [4.0, 5.0, 6.0, 6.0, 6.0, 6.0],
                [7.0, 8.0, 9.0, 9.0, 9.0, 9.0],
                [7.0, 8.0, 9.0, 9.0, 9.0, 9.0],
            ]],
            [[
                [1.0, 1.0, 1.0, 2.0, 3.0, 3.0],
                [4.0, 4.0, 4.0, 5.0, 6.0, 6.0],
                [7.0, 7.0, 7.0, 8.0, 9.0, 9.0],
                [7.0, 7.0, 7.0, 8.0, 9.0, 9.0],
                [7.0, 7.0, 7.0, 8.0, 9.0, 9.0],
                [7.0, 7.0, 7.0, 8.0, 9.0, 9.0],
            ]],
            [[
                [1.0, 2.0, 3.0, 3.0, 3.0, 3.0],
                [4.0, 5.0, 6.0, 6.0, 6.0, 6.0],
                [7.0, 8.0, 9.0, 9.0, 9.0, 9.0],
                [7.0, 8.0, 9.0, 9.0, 9.0, 9.0],
                [7.0, 8.0, 9.0, 9.0, 9.0, 9.0],
                [7.0, 8.0, 9.0, 9.0, 9.0, 9.0],
            ]],
        ]);

        output.to_data().assert_eq(&expected_data, false);
    }

    #[test]
    fn test_stitch() {
        let device = WgpuDevice::default();

        let image = Tensor::<Back, 3>::from_floats(
            [
                [[1., 2., 3.], [4., 5., 6.], [7., 8., 9.]],
                [[1., 2., 3.], [4., 5., 6.], [7., 8., 9.]],
                [[1., 2., 3.], [4., 5., 6.], [7., 8., 9.]],
            ],
            &device,
        );

        println!("Shape: {:?}", image.dims());

        let (patches, padded_image_shape) =
            split_image_into_overlapping_patches(image.clone(), 2, 2);

        let output = stitch_together(
            patches,
            padded_image_shape,
            [image.dims()[1], image.dims()[2]],
            2,
            &device,
        );

        println!("Output: {output}");

        image.to_data().assert_eq(&output.to_data(), false);
    }
}
