#![recursion_limit = "256"]

use burn::{
    backend::{Wgpu, wgpu::WgpuDevice},
    module::Module,
    record::{FullPrecisionSettings, Recorder},
    tensor::{Shape, Tensor},
};
use burn_import::pytorch::{LoadArgs, PyTorchFileRecorder};
use real_esrgan::model::RealESRGANConfig; // Assuming this path is correct

type Back = Wgpu<f32, i32>;


const BATCH_SIZE: usize = 4;
const PATCH_SIZE: usize = 64;
const PADDING: usize = 24;
const PAD_SIZE: usize = 2;

fn main() {
    let device = WgpuDevice::DiscreteGpu(0);

    println!("Using device: {:?}", device);

    let load_args =
        LoadArgs::new("./RealESRGAN_x4.pth".into()).with_key_remap(r"^(.*)", "model.$1");

    println!("Loading weights...");
    let record = PyTorchFileRecorder::<FullPrecisionSettings>::default()
        .load(load_args, &device)
        .expect("Should decode state successfully");
    println!("Weights loaded.");

    println!("Initializing model...");
    let model = RealESRGANConfig::new(3, 3, 4, 64, 23, 32)
        .init::<Back>(&device)
        .load_record(record);
    println!("Model initialized and weights loaded into model.");

    println!("Running inference...");
    let input_tensor: Tensor<Back, 3> = Tensor::ones(Shape::new([3, 1080, 1920]), &device);
    let input_tensor = input_tensor * 255.0;
    let output_tensor: Tensor<Back, 3> = model.predict(
        input_tensor,
        BATCH_SIZE,
        PATCH_SIZE,
        PADDING,
        PAD_SIZE,
        &device);
    println!("Output shape: {:?}", output_tensor.shape());
    println!("Output data: {}", output_tensor);
    println!("Inference done.");
}
