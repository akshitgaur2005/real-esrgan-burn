use burn::{backend::Wgpu, module::Module, record::FullPrecisionSettings};
use burn_import::pytorch::PyTorchFileRecorder;
use esrgan::model::RealESRGANConfig;
use burn_ndarray;
use burn::record::Recorder;

type Back = burn_ndarray::NdArray<f32>;

fn main() {
    let device = Default::default();
    let record = PyTorchFileRecorder::<FullPrecisionSettings>::default()
        .load("./RealESRGAN_x4.pth".into(), &device)
        .expect("Should load model!");
    let model = RealESRGANConfig::new(3, 3, 4, 64, 23, 32).init::<Back>(&device).load_record(record);

    println!("{}", model);
}
