pub mod rrdbnet;

use burn::prelude::*;
use rrdbnet::RRDBNetConfig;

use crate::RRDBNet;

#[derive(Module, Debug)]
pub struct RealESRGAN<B: Backend> {
    pub model: RRDBNet<B>
}

impl<B: Backend> RealESRGAN<B> {
    pub fn forward(&self, x: Tensor<B, 4>) -> Tensor<B, 4> {
        self.model.forward(x)
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
                self.num_grow_ch
            ).init(device)
        }
    }
}
