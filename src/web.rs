#![allow(clippy::new_without_default)]

use alloc::{
    string::{String, ToString},
    vec::Vec,
};
use model::{RealESRGAN, RealESRGANConfig};
use core::convert::Into;

use burn::{
    backend::{wgpu::init_setup_async, NdArray}, prelude::*, record::{BinBytesRecorder, FullPrecisionSettings, NamedMpkFileRecorder, Recorder}, tensor::{activation::softmax, f16}
};

use burn::backend::wgpu::{WgpuDevice, Wgpu, graphics::AutoGraphicsApi};

use serde::Serialize;
use wasm_bindgen::prelude::*;
use web_time::Instant;


static STATE_ENCODED: &[u8] = include_bytes!("../x4.bin");

#[wasm_bindgen(start)]
pub fn start() {
    // Initialize the logger so that the logs are printed to the console
    console_error_panic_hook::set_once();
    wasm_logger::init(wasm_logger::Config::default());
}

#[allow(clippy::large_enum_variant)]
/// The model is loaded to a specific backend
pub enum ModelType {
    /// The model is loaded to the NdArray backend
    WithNdArrayBackend(Model<NdArray<f32>>),

    /// The model is loaded to the WebGpu backend
    WithWgpuBackendf32(Model<Wgpu<f32, i32>>),
    WithWgpuBackendf16(Model<Wgpu<f16, i32>>),
}


/// The image classifier
#[wasm_bindgen]
pub struct Upscaler {
    model: ModelType,
}

#[wasm_bindgen]
impl Upscaler {
    /// Constructor called by JavaScripts with the new keyword.
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        log::info!("Initializing the image classifier");
        let device = Default::default();
        Self {
            model: ModelType::WithNdArrayBackend(Model::new(&device)),
        }
    }

    /// Runs inference on the image
    pub async fn inference(&self, input: &[f32], height: usize, width: usize, batch_size: usize, patch_size: usize, padding: usize, pad_size: usize) -> Result<Vec<u8>, JsValue> {
        log::info!("Upscaling the image...");

        let start = Instant::now();

        let result = match self.model {
            ModelType::WithNdArrayBackend(ref model) => model.forward(input, height, width, batch_size, patch_size, padding, pad_size).await,
            ModelType::WithWgpuBackendf32(ref model) => model.forward(input, height, width, batch_size, patch_size, padding, pad_size).await,
            ModelType::WithWgpuBackendf16(ref model) => model.forward(input, height, width, batch_size, patch_size, padding, pad_size).await,
        };

        let duration = start.elapsed();

        log::debug!("Inference is completed in {:?}", duration);

        let output: Vec<u8> = result
            .into_iter()
            .map(|p| p as u8)
            .collect();

        Ok(output)
    }

    /// Sets the backend to NdArray
    pub async fn set_backend_ndarray(&mut self) -> Result<(), JsValue> {
        log::info!("Loading the model to the NdArray backend");
        let start = Instant::now();
        let device = Default::default();
        self.model = ModelType::WithNdArrayBackend(Model::new(&device));
        let duration = start.elapsed();
        log::debug!("Model is loaded to the NdArray backend in {:?}", duration);
        Ok(())
    }

    /// Sets the backend to Wgpu f32
    pub async fn set_backend_wgpu_f32(&mut self) -> Result<(), JsValue> {
        log::info!("Loading the model to the Wgpu backend");
        let start = Instant::now();
        let device = WgpuDevice::default();
        init_setup_async::<AutoGraphicsApi>(&device, Default::default()).await;
        self.model = ModelType::WithWgpuBackendf32(Model::new(&device));
        let duration = start.elapsed();
        log::debug!("Model is loaded to the Wgpu backend in {:?}", duration);

        log::debug!("Warming up the model");
        let start = Instant::now();
        let _ = self.inference(&[0.0; 20 * 20 * 3], 20, 20, 2, 128, 1, 1).await;
        let duration = start.elapsed();
        log::debug!("Warming up is completed in {:?}", duration);
        Ok(())
    }

    /// Sets the backend to Wgpu f16
    pub async fn set_backend_wgpu_f16(&mut self) -> Result<(), JsValue> {
        log::info!("Loading the model to the Wgpu backend");
        let start = Instant::now();
        let device = WgpuDevice::default();
        init_setup_async::<AutoGraphicsApi>(&device, Default::default()).await;
        self.model = ModelType::WithWgpuBackendf16(Model::new(&device));
        let duration = start.elapsed();
        log::debug!("Model is loaded to the Wgpu backend in {:?}", duration);

        log::debug!("Warming up the model");
        let start = Instant::now();
        let _ = self.inference(&[0.0; 20 * 20 * 3], 20, 20, 2, 128, 1, 1).await;
        let duration = start.elapsed();
        log::debug!("Warming up is completed in {:?}", duration);
        Ok(())
    }
}

/// The image classifier model
pub struct Model<B: Backend> {
    model: RealESRGAN<B>,
}

impl<B: Backend> Model<B> {
    /// Constructor
    pub fn new(device: &B::Device) -> Self {
        let record = BinBytesRecorder::<FullPrecisionSettings, &'static [u8]>::default()
            .load(STATE_ENCODED, device)
            .expect("Failed to decode state");
        Self {
            model: RealESRGANConfig::new(3, 3, 4, 64, 23, 32)
                .init::<B>(device)
                .load_record(record)
        }
    }

    /// Normalizes input and runs inference on the image
    pub async fn forward(&self, input: &[f32], height: usize, width: usize, batch_size: usize, patch_size: usize, padding: usize, pad_size: usize) -> Vec<f32> {
        // Reshape from the 1D array to 3d tensor [ width, height, channels]
        let input = Tensor::<B, 1>::from_floats(input, &B::Device::default())
            .reshape([3, height, width]);

        // Run the tensor input through the model
        let output = self.model.predict(input, batch_size, patch_size, padding, pad_size, &self.model.devices()[0]);

        println!("Before data");
        let data = output
            .clamp(0.0, 255.0)
            .into_data_async()
            .await
            .convert::<f32>()
            .into_vec()
            .expect("Failed at data async");

        println!("After data");
        data
    }
}
