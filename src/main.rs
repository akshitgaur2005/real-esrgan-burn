use burn::{
    // Import the LibTorch backend components
    backend::libtorch::{LibTorch, LibTorchDevice},
    module::Module,
    record::{FullPrecisionSettings, Recorder},
    tensor::{Shape, Tensor},
};
use burn_import::pytorch::{LoadArgs, PyTorchFileRecorder};
use real_esrgan::model::RealESRGANConfig; // Assuming this path is correct

// --- Choose your backend ---
// Option 1: Standard LibTorch backend
type Back = LibTorch<f32>;
// --- End of Backend Choice ---

fn main() {
    // --- Choose your device ---
    // Option 1: CPU
    // let device = LibTorchDevice::Cpu;

    // Option 2: CUDA GPU (requires "cuda" feature in Cargo.toml and proper CUDA/LibTorch setup)
    // Make sure CUDA drivers, toolkit, and potentially cuDNN are installed and compatible
    let device = LibTorchDevice::Cuda(0); // Use GPU with index 0

    // Option 3: Default device (might automatically select CUDA if available, check Burn docs)
    // let device = LibTorchDevice::default();
    // --- End of Device Choice ---

    println!("Using device: {:?}", device);

    let load_args = LoadArgs::new("./RealESRGAN_x4.pth".into())
        // Key remapping might need adjustment depending on how weights were saved
        // and Burn's expected format. This looks plausible.
        .with_key_remap(r"^(.*)", "model.$1");

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

    // Your check for bias (should still work)
    let bias_tensor = model.model.body[0].rdb1.conv1.bias.clone().expect("Should have bias!");
    // Maybe print shape or a few values to confirm it looks right
    println!("Bias shape: {:?}", bias_tensor.shape());
    println!("First few bias values: {:?}", bias_tensor.to_data());


    // Example: Run inference (uncomment and adapt)
    println!("Running inference...");
    let input_tensor: Tensor<Back, 4> = Tensor::ones(Shape::new([1, 3, 10, 20]), &device);
    let output_tensor = model.forward(input_tensor);
    println!("Output shape: {:?}", output_tensor.shape());
    // // Caution: Printing large tensors can be slow/spammy
    println!("Output data: {}", output_tensor);
    println!("Inference done.");
}
