use burn::{backend::Wgpu, module::Module, record::FullPrecisionSettings};
use burn_import::pytorch::{LoadArgs, PyTorchFileRecorder};
use esrgan::model::RealESRGANConfig;
use burn_ndarray;
use burn::record::Recorder;

type Back = burn_ndarray::NdArray<f32>;

fn main() {
    let device = Default::default();
    let load_args = LoadArgs::new("./RealESRGAN_x4.pth".into())
        .with_key_remap(r"^(.*)", "model.$1");

    let record = PyTorchFileRecorder::<FullPrecisionSettings>::default()
        .load(load_args, &device)
        .expect("Should decode state successfully");

    let model = RealESRGANConfig::new(3, 3, 4, 64, 23, 32).init::<Back>(&device).load_record(record);

    println!("{}", model);
}
