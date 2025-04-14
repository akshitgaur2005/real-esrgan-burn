use burn::{backend::Wgpu, module::Module, record::FullPrecisionSettings, tensor::{Shape, Tensor}};
use burn_import::pytorch::{LoadArgs, PyTorchFileRecorder};
use esrgan::model::RealESRGANConfig;
use burn_ndarray;
use burn::record::Recorder;

type Back = burn_ndarray::NdArray<f32>;

fn main() {
    let device = burn::backend::ndarray::NdArrayDevice::default();
    let load_args = LoadArgs::new("./RealESRGAN_x4.pth".into())
        .with_key_remap(r"^(.*)", "model.$1");

    let record = PyTorchFileRecorder::<FullPrecisionSettings>::default()
        .load(load_args, &device)
        .expect("Should decode state successfully");

    let model = RealESRGANConfig::new(3, 3, 4, 64, 23, 32).init::<Back>(&device).load_record(record);

    let x = Tensor::ones(Shape::new([1, 3, 10, 20]), &device);
    println!("{}", model.forward(x));
}
