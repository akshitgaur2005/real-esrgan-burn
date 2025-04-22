pub mod rrdbnet;
pub mod utils;

use burn::prelude::*;
use rrdbnet::RRDBNetConfig;
use utils::*;

use crate::RRDBNet;

#[derive(Module, Debug)]
pub struct RealESRGAN<B: Backend> {
    pub model: RRDBNet<B>,
}

impl<B: Backend> RealESRGAN<B> {
    pub fn forward(&self, x: Tensor<B, 4>) -> Tensor<B, 4> {
        self.model.forward(x)
    }

    pub fn predict(&self, image: Tensor<B, 3>, batch_size: usize, patches_size: usize, padding: usize, pad_size: usize, device: &B::Device) -> Tensor<B, 3> {
        let scale = 4;

        println!("Starting pad_reflect, image: {:?}", image.dims());
        let image = pad_reflect(image, pad_size, device);

        println!("Starting split, dims: {:?}", image.dims());
        let (patches, p_shape) = split_image_into_overlapping_patches(image.clone(), patches_size, padding);

        let img = patches / 255.0;

        println!("Starting inference, img: {:?}", img.dims());
        let mut res = self.forward(img.clone().slice([0..batch_size]));

        for i in (batch_size..img.dims()[0]).step_by(batch_size) {
            println!("Batch {i} of {}", img.dims()[0]);
            res = Tensor::cat(vec![res, self.forward(img.clone().slice([i..i + batch_size]))], 0);
        }

        res = res.clamp(0, 1);

        println!("Starting stitching, res_shape: {:?}", res.dims());
        let sr_image = stitch_together(
            res,
            [3, p_shape[1] * scale, p_shape[2] * scale],
            [image.dims()[1] * scale, image.dims()[2] * scale],
            padding * scale, device);

        let sr_image = sr_image * 255.0;
        let sr_image = unpad_image(sr_image, pad_size * scale);

        return sr_image;
    }
}

#[derive(Config, Debug)]
pub struct RealESRGANConfig {
    num_in_ch: usize,
    num_out_ch: usize,
    scale: usize,
    num_feat: usize,
    num_block: usize,
    num_grow_ch: usize,
}

impl RealESRGANConfig {
    pub fn init<B: Backend>(&self, device: &B::Device) -> RealESRGAN<B> {
        RealESRGAN {
            model: RRDBNetConfig::new(
                self.num_in_ch,
                self.num_out_ch,
                self.scale,
                self.num_feat,
                self.num_block,
                self.num_grow_ch,
            )
            .init(device),
        }
    }
}
