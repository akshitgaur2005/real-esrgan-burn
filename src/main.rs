#![recursion_limit = "256"]

use burn::{
    backend::{libtorch::LibTorchDevice,
              wgpu::{flex32, WgpuDevice},
              LibTorch, Vulkan, Wgpu},
    module::Module,
    record::{FullPrecisionSettings, Recorder, NamedMpkFileRecorder},
    tensor::{f16, Shape, Tensor}
};
use burn::prelude::*;
use model::RealESRGANConfig;
use model::utils::{load_image_to_tensor, save_tensor_to_image};

//type Back = Wgpu<f32, i32>;
type Back = LibTorch<f16>;
//type Back = Vulkan<flex32, i32>;

const BATCH_SIZE: usize = 2;
const PATCH_SIZE: usize = 128;
const PADDING: usize = 16;
const PAD_SIZE: usize = 2;

fn main() {
    //let device = WgpuDevice::DiscreteGpu(0);
    let device = LibTorchDevice::Cuda(0);


    println!("Using device: {:?}", device);

    //let load_args =
    //    LoadArgs::new("./RealESRGAN_x4.pth".into()).with_key_remap(r"^(.*)", "model.$1");

    println!("Loading weights...");
    //let record = PyTorchFileRecorder::<FullPrecisionSettings>::default()
    //    .load(load_args, &device)
    //    .expect("Should decode state successfully");

    let record = NamedMpkFileRecorder::<FullPrecisionSettings>::default()
        .load("./x4.model".into(), &device)
        .expect("Failed to decode state");
    println!("Weights loaded.");

    println!("Initializing model...");
    let model = RealESRGANConfig::new(3, 3, 4, 64, 23, 32)
        .init::<Back>(&device)
        .load_record(record);
    println!("Model initialized and weights loaded into model.");

    println!("Running inference...");
    let input_tensor = load_image_to_tensor("./samples/cat.jpg", &device).expect("Should load tensor!");
    let output_tensor: Tensor<Back, 3> = model.predict(
        input_tensor,
        BATCH_SIZE,
        PATCH_SIZE,
        PADDING,
        PAD_SIZE,
        &device);
    println!("Output shape: {:?}", output_tensor.shape());
    println!("Output data: {}", output_tensor);
    let _ = save_tensor_to_image(&output_tensor, "./samples/upscaled-cat.jpg");
    println!("Inference done.");
}
