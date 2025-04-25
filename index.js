import * as wasmFeatureDetect from "https://cdn.jsdelivr.net/npm/wasm-feature-detect@1.5.1/dist/esm/index.js";

// Helper to get DOM elements
const $ = (id) => document.getElementById(id);

// DOM Elements
const imgDropdown = $("imageDropdown");
const backendDropdown = $("backend");
const fileInput = $("fileInput");
const inputCanvas = $("inputCanvas");
const inputCtx = inputCanvas.getContext("2d", { willReadFrequently: true });
const outputCanvas = $("outputCanvas");
const outputCtx = outputCanvas.getContext("2d");
const clearButton = $("clearButton");
const timeDiv = $("time");
const statusDiv = $("status");
const inputDimensionsDiv = $("inputDimensions");
const outputDimensionsDiv = $("outputDimensions");

// --- Configuration ---
const SCALE_FACTOR = 4; // RealESRGAN x4 model
// These might need tuning based on the model and device capabilities
const BATCH_SIZE = 1;
const PATCH_SIZE = 128; // Common patch size, adjust if needed
const PADDING = 10;     // Padding around patches
const PAD_SIZE = 10;    // Seems related to padding, check model specifics

// Module level variables
let upscaler;
let currentImageData = null; // Store original image data for reuse
let currentImageName = ""; // Store name for logging
let isProcessing = false; // Prevent concurrent runs

// --- Initialization ---

async function initWasm() {
  statusDiv.textContent = "Initializing WASM...";
  try {
    let simdSupported = await wasmFeatureDetect.simd();

    // Note: SIMD might cause issues with specific backends/browsers (like NdArray on Safari).
    // Keep the check, but be mindful if errors occur.
    // Example: Disable SIMD for Safari if necessary
    // if (isSafari() && simdSupported) {
    //     console.warn("Safari detected. Disabling WASM SIMD as a precaution...");
    //     simdSupported = false;
    // }

    console.debug(`SIMD supported: ${simdSupported}`);

    // Adjust path based on your build output (simd/no_simd)
    const modulePath = simdSupported
      ? "./pkg/simd/real_esrgan.js" // CHANGE THIS if your package name is different
      : "./pkg/no_simd/real_esrgan.js"; // CHANGE THIS if your package name is different

    const { default: wasm, Upscaler } = await import(modulePath); // Import Upscaler

    await wasm(); // Initialize the WASM module

    // Initialize the upscaler and save to module level variable
    upscaler = new Upscaler();
    console.log("WASM module loaded and Upscaler initialized.");
    statusDiv.textContent = "WASM Initialized. Select backend and image.";

    // Check WebGPU/Vulkan support
    if (!navigator.gpu) {
        console.warn("WebGPU (for Vulkan backend) not supported. Disabling GPU options.");
        backendDropdown.options[1].disabled = true; // Disable Vulkan f32
        backendDropdown.options[2].disabled = true; // Disable Vulkan f16
        statusDiv.textContent += " (GPU backends disabled)";
    } else {
        console.log("WebGPU API detected (required for Vulkan backend).");
    }

  } catch (error) {
    console.error("Error initializing WASM:", error);
    statusDiv.textContent = "Error initializing WASM. Check console.";
  }
}

// --- Event Handlers ---

imgDropdown.addEventListener("change", async function() {
    if (this.value && !isProcessing) {
        fileInput.value = ""; // Clear file input if dropdown is used
        currentImageName = this.options[this.selectedIndex].text;
        await loadImage(this.value);
    }
});

fileInput.addEventListener("change", async function() {
    if (this.files && this.files[0] && !isProcessing) {
        imgDropdown.selectedIndex = 0; // Reset dropdown
        currentImageName = this.files[0].name;
        const reader = new FileReader();
        reader.onload = (event) => loadImage(event.target.result);
        reader.readAsDataURL(this.files[0]);
    }
});

backendDropdown.addEventListener("change", async function() {
    if (!upscaler || isProcessing) return;
    const backend = this.value;
    statusDiv.textContent = `Setting backend to ${this.options[this.selectedIndex].text}...`;
    isProcessing = true;
    timeDiv.innerHTML = "&nbsp;";
    try {
        let startTime = performance.now();
        if (backend === "ndarray") await upscaler.set_backend_ndarray();
        if (backend === "webgpu_f32") await upscaler.set_backend_wgpu_f32(); // Matches Rust function name
        if (backend === "webgpu_f16") await upscaler.set_backend_wgpu_f16(); // Matches Rust function name
        let endTime = performance.now();
        console.log(`Backend set to ${backend} in ${toFixed(endTime - startTime)} ms`);
        statusDiv.textContent = `Backend set to ${this.options[this.selectedIndex].text}. Ready for inference.`;

        // Optional: Re-run inference if an image is already loaded
        if (currentImageData) {
            console.log("Re-running inference after backend change.");
            await runInference();
        }
    } catch (error) {
        console.error(`Error setting backend ${backend}:`, error);
        statusDiv.textContent = `Error setting backend ${backend}. Check console.`;
    } finally {
         isProcessing = false;
    }
});

clearButton.addEventListener("click", resetAll);

// --- Core Logic ---

async function loadImage(src) {
  if (isProcessing) return;
  isProcessing = true;
  statusDiv.textContent = `Loading image: ${currentImageName}...`;
  timeDiv.innerHTML = "&nbsp;"; // Clear previous time
  outputDimensionsDiv.textContent = ""; // Clear old dimensions

  const img = new Image();
  img.src = src;

  try {
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });

    console.log(`Image loaded: ${currentImageName} (${img.naturalWidth}x${img.naturalHeight})`);

    // Store original dimensions
    const inputWidth = img.naturalWidth;
    const inputHeight = img.naturalHeight;

    // Clear previous output and display input
    clearAndDrawInputCanvas(img, inputWidth, inputHeight);
    outputCtx.clearRect(0, 0, outputCanvas.width, outputCanvas.height); // Clear output canvas

    // Extract pixel data in the planar format [R..., G..., B...]
    currentImageData = extractPlanarRGB(inputCanvas, inputCtx, inputWidth, inputHeight);

    if (upscaler) {
        await runInference(); // Run inference automatically after loading
    } else {
        statusDiv.textContent = "Image loaded. Waiting for WASM initialization...";
    }

  } catch (error) {
    console.error("Error loading image:", error);
    statusDiv.textContent = "Error loading image. Check console.";
    currentImageData = null;
  } finally {
      isProcessing = false;
  }
}

/**
 * Extracts pixel data from canvas into a Float32Array with planar RGB format.
 * Output: [R1, R2, ..., G1, G2, ..., B1, B2, ...] with values 0.0-255.0
 */
function extractPlanarRGB(canvas, ctx, width, height) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data; // Uint8ClampedArray [R, G, B, A, R, G, B, A, ...]
    const numPixels = width * height;
    const floatArray = new Float32Array(numPixels * 3);

    for (let i = 0; i < numPixels; i++) {
        floatArray[i] = data[i * 4];             // R channel
        floatArray[i + numPixels] = data[i * 4 + 1]; // G channel
        floatArray[i + numPixels * 2] = data[i * 4 + 2]; // B channel
    }
    console.log(`Extracted planar RGB data (${floatArray.length} floats)`);
    return floatArray;
}


async function runInference() {
    if (!upscaler || !currentImageData || isProcessing) {
        console.warn("Inference pre-conditions not met (upscaler ready? image loaded? not processing?).");
        return;
    }

    isProcessing = true;
    statusDiv.textContent = `Upscaling ${currentImageName}...`;
    outputCtx.clearRect(0, 0, outputCanvas.width, outputCanvas.height); // Clear previous output
    timeDiv.innerHTML = "&nbsp;";

    const inputWidth = inputCanvas.width;
    const inputHeight = inputCanvas.height;

    try {
        console.log(`Running inference with: width=${inputWidth}, height=${inputHeight}, batch=${BATCH_SIZE}, patch=${PATCH_SIZE}, padding=${PADDING}, pad_size=${PAD_SIZE}`);
        const startTime = performance.now();

        // Call the WASM function
        const outputUint8Data = await upscaler.inference(
            currentImageData, // Float32Array [R.., G.., B..]
            inputHeight,      // usize
            inputWidth,       // usize
            BATCH_SIZE,       // usize
            PATCH_SIZE,       // usize
            PADDING,          // usize
            PAD_SIZE          // usize
        );

        const timeTaken = performance.now() - startTime;
        console.log(`Inference completed in ${toFixed(timeTaken)} ms.`);
        timeDiv.innerHTML = `Inference Time: <span> ${toFixed(timeTaken)} </span> ms.`;
        statusDiv.textContent = `Upscaling complete for ${currentImageName}.`;

        // Display the upscaled image
        const outputWidth = inputWidth * SCALE_FACTOR;
        const outputHeight = inputHeight * SCALE_FACTOR;
        displayUpscaledImage(outputUint8Data, outputWidth, outputHeight, outputCanvas, outputCtx);

    } catch (error) {
        console.error("Error during inference:", error);
        statusDiv.textContent = "Error during inference. Check console.";
        // Display error visually?
    } finally {
        isProcessing = false;
    }
}

/**
 * Displays the upscaled image data (Uint8Array, RGB planar) onto the output canvas.
 */
function displayUpscaledImage(rgbData, width, height, canvas, ctx) {
    console.log(`Displaying upscaled image (${width}x${height}). Received ${rgbData.length} bytes.`);

    // We need to convert the planar RGB Uint8Array back to an RGBA Uint8ClampedArray
    // for ImageData. Input: [R1..Rn, G1..Gn, B1..Bn] -> Output: [R1,G1,B1,A1, R2,G2,B2,A2, ...]
    const numPixels = width * height;
    if (rgbData.length !== numPixels * 3) {
        console.error(`Data length mismatch: expected ${numPixels * 3}, got ${rgbData.length}`);
        statusDiv.textContent = "Error: Output data size incorrect.";
        return;
    }

    const rgbaData = new Uint8ClampedArray(numPixels * 4);
    for (let i = 0; i < numPixels; i++) {
        rgbaData[i * 4] = rgbData[i];                 // R
        rgbaData[i * 4 + 1] = rgbData[i + numPixels];   // G
        rgbaData[i * 4 + 2] = rgbData[i + numPixels * 2]; // B
        rgbaData[i * 4 + 3] = 255;                    // Alpha (fully opaque)
    }

    // Create ImageData and put it on the canvas
    const imageData = new ImageData(rgbaData, width, height);

    // Resize canvas to match output dimensions
    canvas.width = width;
    canvas.height = height;

    // Draw the image data
    ctx.putImageData(imageData, 0, 0);
    console.log("Upscaled image drawn to output canvas.");
    outputDimensionsDiv.textContent = `${width} x ${height}`;
}

// --- Utility Functions ---

function clearAndDrawInputCanvas(img, width, height) {
  // Resize canvas to match input image
  inputCanvas.width = width;
  inputCanvas.height = height;
  // Clear and draw
  inputCtx.clearRect(0, 0, width, height);
  inputCtx.drawImage(img, 0, 0, width, height);
  console.log(`Input image drawn to canvas (${width}x${height})`);
  inputDimensionsDiv.textContent = `${width} x ${height}`;
}

function resetAll() {
  if (isProcessing) return;
  console.log("Clearing canvases and inputs.");
  // Clear canvases
  inputCtx.clearRect(0, 0, inputCanvas.width, inputCanvas.height);
  outputCtx.clearRect(0, 0, outputCanvas.width, outputCanvas.height);

  // Reset inputs
  imgDropdown.selectedIndex = 0;
  fileInput.value = "";

  // Clear status/time/dimensions
  timeDiv.innerHTML = "&nbsp;";
  statusDiv.textContent = "Cleared. Select backend and image.";
  inputDimensionsDiv.textContent = "";
  outputDimensionsDiv.textContent = "";

  // Reset internal state
  currentImageData = null;
  currentImageName = "";

  // Reset canvas sizes to default (optional)
  // inputCanvas.width = 224; inputCanvas.height = 224;
  // outputCanvas.width = 896; outputCanvas.height = 896;
}

function toFixed(num, digits = 2) {
  return num.toFixed(digits);
}

// Check if the browser is Safari (useful for specific workarounds like SIMD)
// function isSafari() {
//   return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
// }

// --- Start Initialization ---
initWasm();
