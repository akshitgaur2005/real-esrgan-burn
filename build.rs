use std::path::Path;

use burn::{
    backend::NdArray,
    record::{FullPrecisionSettings, NamedMpkFileRecorder, Recorder},
};
use burn_import::pytorch::{PyTorchFileRecorder, LoadArgs};
use model::model::RealESRGANRecord;

// Basic backend type (not used directly here).
type B = NdArray<f32>;

fn main() {
    let device = Default::default();

    let load_args =
        LoadArgs::new("./RealESRGAN_x4.pth".into()).with_key_remap(r"^(.*)", "model.$1");

    // Load PyTorch weights into a model record.
    let record: RealESRGANRecord<B> = PyTorchFileRecorder::<FullPrecisionSettings>::default()
        .load(load_args, &device)
        .expect("Failed to decode state");

    // Save the model record to a file.
    let recorder = NamedMpkFileRecorder::<FullPrecisionSettings>::default();

    // Save into the OUT_DIR directory so that the model can be loaded by the
    let file_path = Path::new("./x4.model").to_path_buf();

    recorder
        .record(record, file_path)
        .expect("Failed to save model record");
}
