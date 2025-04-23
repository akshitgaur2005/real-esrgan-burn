use burn::nn::{
    LeakyRelu, LeakyReluConfig, PaddingConfig2d,
    conv::{Conv2d, Conv2dConfig},
    interpolate::{Interpolate2dConfig, InterpolateMode::Nearest},
};
use burn::prelude::*;

#[derive(Module, Debug)]
pub struct ResidualDenseBlock<B: Backend> {
    pub conv1: Conv2d<B>,
    conv2: Conv2d<B>,
    conv3: Conv2d<B>,
    conv4: Conv2d<B>,
    conv5: Conv2d<B>,
    lrelu: LeakyRelu,
}

impl<B: Backend> ResidualDenseBlock<B> {
    // Forward pass for RDB
    //
    // Args:
    //    x (Tensor<B, 4>): Input tensor with shape [batch_size, num_feat, height, width]
    //
    //
    // Returns:
    //    Tensor<B, 4>: Output tensor with shape [batch_size, num_feat, height, width]
    pub fn forward(&self, x: Tensor<B, 4>) -> Tensor<B, 4> {
        let x1 = self.lrelu.forward(self.conv1.forward(x.clone()));
        let x2 = self.lrelu.forward(
            self.conv2
                .forward(Tensor::cat(vec![x.clone(), x1.clone()], 1)),
        );
        let x3 = self.lrelu.forward(
            self.conv3
                .forward(Tensor::cat(vec![x.clone(), x1.clone(), x2.clone()], 1)),
        );
        let x4 = self.lrelu.forward(self.conv4.forward(Tensor::cat(
            vec![x.clone(), x1.clone(), x2.clone(), x3.clone()],
            1,
        )));
        let x5 = self
            .conv5
            .forward(Tensor::cat(vec![x.clone(), x1, x2, x3, x4], 1));

        x5.mul_scalar(0.2) + x
    }
}

#[derive(Config, Debug)]
pub struct ResidualDenseBlockConfig {
    num_feat: usize,
    num_grow_ch: usize,
}

impl ResidualDenseBlockConfig {
    pub fn init<B: Backend>(&self, device: &B::Device) -> ResidualDenseBlock<B> {
        ResidualDenseBlock {
            conv1: Conv2dConfig::new([self.num_feat, self.num_grow_ch], [3, 3])
                .with_stride([1, 1])
                .with_padding(PaddingConfig2d::Explicit(1, 1))
                .init(device),
            conv2: Conv2dConfig::new([self.num_feat + self.num_grow_ch, self.num_grow_ch], [3, 3])
                .with_stride([1, 1])
                .with_padding(PaddingConfig2d::Explicit(1, 1))
                .init(device),
            conv3: Conv2dConfig::new(
                [self.num_feat + 2 * self.num_grow_ch, self.num_grow_ch],
                [3, 3],
            )
            .with_stride([1, 1])
            .with_padding(PaddingConfig2d::Explicit(1, 1))
            .init(device),
            conv4: Conv2dConfig::new(
                [self.num_feat + 3 * self.num_grow_ch, self.num_grow_ch],
                [3, 3],
            )
            .with_stride([1, 1])
            .with_padding(PaddingConfig2d::Explicit(1, 1))
            .init(device),
            conv5: Conv2dConfig::new(
                [self.num_feat + 4 * self.num_grow_ch, self.num_feat],
                [3, 3],
            )
            .with_stride([1, 1])
            .with_padding(PaddingConfig2d::Explicit(1, 1))
            .init(device),
            lrelu: LeakyReluConfig::new().with_negative_slope(0.2).init(),
        }
    }
}

#[derive(Module, Debug)]
pub struct RRDB<B: Backend> {
    pub rdb1: ResidualDenseBlock<B>,
    rdb2: ResidualDenseBlock<B>,
    rdb3: ResidualDenseBlock<B>,
}

impl<B: Backend> RRDB<B> {
    pub fn forward(&self, x: Tensor<B, 4>) -> Tensor<B, 4> {
        let out = self.rdb1.forward(x.clone());
        let out = self.rdb2.forward(out);
        let out = self.rdb3.forward(out);

        out.mul_scalar(0.2) + x
    }
}

#[derive(Config, Debug)]
pub struct RRDBConfig {
    num_feat: usize,
    num_grow_ch: usize,
}

impl RRDBConfig {
    pub fn init<B: Backend>(&self, device: &B::Device) -> RRDB<B> {
        RRDB {
            rdb1: ResidualDenseBlockConfig::new(self.num_feat, self.num_grow_ch).init(device),
            rdb2: ResidualDenseBlockConfig::new(self.num_feat, self.num_grow_ch).init(device),
            rdb3: ResidualDenseBlockConfig::new(self.num_feat, self.num_grow_ch).init(device),
        }
    }
}

#[derive(Module, Debug)]
pub struct RRDBNet<B: Backend> {
    conv_first: Conv2d<B>,
    pub body: Vec<RRDB<B>>,
    conv_body: Conv2d<B>,
    conv_up1: Conv2d<B>,
    conv_up2: Conv2d<B>,
    conv_hr: Conv2d<B>,
    conv_last: Conv2d<B>,
    lrelu: LeakyRelu,
}

impl<B: Backend> RRDBNet<B> {
    pub fn forward(&self, x: Tensor<B, 4>) -> Tensor<B, 4> {
        let feat = self.conv_first.forward(x);
        let mut body_feat = feat.clone();
        for layer in &self.body {
            body_feat = layer.forward(body_feat);
        }
        let body_feat = self.conv_body.forward(body_feat);

        let feat = feat + body_feat;

        // Upsample
        let interpolator = Interpolate2dConfig::new()
            .with_scale_factor(Some([2., 2.]))
            .with_mode(Nearest)
            .init();
        let feat = self
            .lrelu
            .forward(self.conv_up1.forward(interpolator.forward(feat)));
        let feat = self
            .lrelu
            .forward(self.conv_up2.forward(interpolator.forward(feat)));
        let out = self
            .conv_last
            .forward(self.lrelu.forward(self.conv_hr.forward(feat)));
        out
    }
}

#[derive(Config, Debug)]
pub struct RRDBNetConfig {
    num_in_ch: usize,
    num_out_ch: usize,
    scale: usize,
    num_feat: usize,
    num_block: usize,
    num_grow_ch: usize,
}

impl RRDBNetConfig {
    pub fn init<B: Backend>(&self, device: &B::Device) -> RRDBNet<B> {
        let mut body = Vec::new();
        for _ in 0..self.num_block {
            body.push(RRDBConfig::new(self.num_feat, self.num_grow_ch).init(device));
        }

        RRDBNet {
            conv_first: Conv2dConfig::new([self.num_in_ch, self.num_feat], [3, 3])
                .with_stride([1, 1])
                .with_padding(PaddingConfig2d::Explicit(1, 1))
                .init(device),
            body: body,
            conv_body: Conv2dConfig::new([self.num_feat, self.num_feat], [3, 3])
                .with_stride([1, 1])
                .with_padding(PaddingConfig2d::Explicit(1, 1))
                .init(device),
            conv_up1: Conv2dConfig::new([self.num_feat, self.num_feat], [3, 3])
                .with_stride([1, 1])
                .with_padding(PaddingConfig2d::Explicit(1, 1))
                .init(device),
            conv_up2: Conv2dConfig::new([self.num_feat, self.num_feat], [3, 3])
                .with_stride([1, 1])
                .with_padding(PaddingConfig2d::Explicit(1, 1))
                .init(device),
            conv_hr: Conv2dConfig::new([self.num_feat, self.num_feat], [3, 3])
                .with_stride([1, 1])
                .with_padding(PaddingConfig2d::Explicit(1, 1))
                .init(device),
            conv_last: Conv2dConfig::new([self.num_feat, self.num_out_ch], [3, 3])
                .with_stride([1, 1])
                .with_padding(PaddingConfig2d::Explicit(1, 1))
                .init(device),
            lrelu: LeakyReluConfig::new().with_negative_slope(0.2).init(),
        }
    }
}
