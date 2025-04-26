let wasm;

function logError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        let error = (function () {
            try {
                return e instanceof Error ? `${e.message}\n\nStack:\n${e.stack}` : e.toString();
            } catch(_) {
                return "<failed to stringify thrown value>";
            }
        }());
        console.error("wasm-bindgen: imported JS function that was not marked as `catch` threw an error:", error);
        throw e;
    }
}

function addToExternrefTable0(obj) {
    const idx = wasm.__externref_table_alloc();
    wasm.__wbindgen_export_2.set(idx, obj);
    return idx;
}

function handleError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        const idx = addToExternrefTable0(e);
        wasm.__wbindgen_exn_store(idx);
    }
}

const cachedTextDecoder = (typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-8', { ignoreBOM: true, fatal: true }) : { decode: () => { throw Error('TextDecoder not available') } } );

if (typeof TextDecoder !== 'undefined') { cachedTextDecoder.decode(); };

let cachedUint8ArrayMemory0 = null;

function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

function _assertBoolean(n) {
    if (typeof(n) !== 'boolean') {
        throw new Error(`expected a boolean argument, found ${typeof(n)}`);
    }
}

let WASM_VECTOR_LEN = 0;

const cachedTextEncoder = (typeof TextEncoder !== 'undefined' ? new TextEncoder('utf-8') : { encode: () => { throw Error('TextEncoder not available') } } );

const encodeString = (typeof cachedTextEncoder.encodeInto === 'function'
    ? function (arg, view) {
    return cachedTextEncoder.encodeInto(arg, view);
}
    : function (arg, view) {
    const buf = cachedTextEncoder.encode(arg);
    view.set(buf);
    return {
        read: arg.length,
        written: buf.length
    };
});

function passStringToWasm0(arg, malloc, realloc) {

    if (typeof(arg) !== 'string') throw new Error(`expected a string argument, found ${typeof(arg)}`);

    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }

    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = encodeString(arg, view);
        if (ret.read !== arg.length) throw new Error('failed to pass whole string');
        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

let cachedDataViewMemory0 = null;

function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}

function _assertNum(n) {
    if (typeof(n) !== 'number') throw new Error(`expected a number argument, found ${typeof(n)}`);
}

let cachedUint32ArrayMemory0 = null;

function getUint32ArrayMemory0() {
    if (cachedUint32ArrayMemory0 === null || cachedUint32ArrayMemory0.byteLength === 0) {
        cachedUint32ArrayMemory0 = new Uint32Array(wasm.memory.buffer);
    }
    return cachedUint32ArrayMemory0;
}

function getArrayU32FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint32ArrayMemory0().subarray(ptr / 4, ptr / 4 + len);
}

function isLikeNone(x) {
    return x === undefined || x === null;
}

const CLOSURE_DTORS = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(state => {
    wasm.__wbindgen_export_6.get(state.dtor)(state.a, state.b)
});

function makeMutClosure(arg0, arg1, dtor, f) {
    const state = { a: arg0, b: arg1, cnt: 1, dtor };
    const real = (...args) => {
        // First up with a closure we increment the internal reference
        // count. This ensures that the Rust closure environment won't
        // be deallocated while we're invoking it.
        state.cnt++;
        const a = state.a;
        state.a = 0;
        try {
            return f(a, state.b, ...args);
        } finally {
            if (--state.cnt === 0) {
                wasm.__wbindgen_export_6.get(state.dtor)(a, state.b);
                CLOSURE_DTORS.unregister(state);
            } else {
                state.a = a;
            }
        }
    };
    real.original = state;
    CLOSURE_DTORS.register(real, state, state);
    return real;
}

function debugString(val) {
    // primitive types
    const type = typeof val;
    if (type == 'number' || type == 'boolean' || val == null) {
        return  `${val}`;
    }
    if (type == 'string') {
        return `"${val}"`;
    }
    if (type == 'symbol') {
        const description = val.description;
        if (description == null) {
            return 'Symbol';
        } else {
            return `Symbol(${description})`;
        }
    }
    if (type == 'function') {
        const name = val.name;
        if (typeof name == 'string' && name.length > 0) {
            return `Function(${name})`;
        } else {
            return 'Function';
        }
    }
    // objects
    if (Array.isArray(val)) {
        const length = val.length;
        let debug = '[';
        if (length > 0) {
            debug += debugString(val[0]);
        }
        for(let i = 1; i < length; i++) {
            debug += ', ' + debugString(val[i]);
        }
        debug += ']';
        return debug;
    }
    // Test for built-in
    const builtInMatches = /\[object ([^\]]+)\]/.exec(toString.call(val));
    let className;
    if (builtInMatches && builtInMatches.length > 1) {
        className = builtInMatches[1];
    } else {
        // Failed to match the standard '[object ClassName]'
        return toString.call(val);
    }
    if (className == 'Object') {
        // we're a user defined class or Object
        // JSON.stringify avoids problems with cycles, and is generally much
        // easier than looping through ownProperties of `val`.
        try {
            return 'Object(' + JSON.stringify(val) + ')';
        } catch (_) {
            return 'Object';
        }
    }
    // errors
    if (val instanceof Error) {
        return `${val.name}: ${val.message}\n${val.stack}`;
    }
    // TODO we could test for more things here, like `Set`s and `Map`s.
    return className;
}

export function start() {
    wasm.start();
}

let cachedFloat32ArrayMemory0 = null;

function getFloat32ArrayMemory0() {
    if (cachedFloat32ArrayMemory0 === null || cachedFloat32ArrayMemory0.byteLength === 0) {
        cachedFloat32ArrayMemory0 = new Float32Array(wasm.memory.buffer);
    }
    return cachedFloat32ArrayMemory0;
}

function passArrayF32ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 4, 4) >>> 0;
    getFloat32ArrayMemory0().set(arg, ptr / 4);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}
function __wbg_adapter_30(arg0, arg1, arg2) {
    _assertNum(arg0);
    _assertNum(arg1);
    wasm.closure986_externref_shim(arg0, arg1, arg2);
}

function __wbg_adapter_325(arg0, arg1, arg2, arg3) {
    _assertNum(arg0);
    _assertNum(arg1);
    wasm.closure1008_externref_shim(arg0, arg1, arg2, arg3);
}

const __wbindgen_enum_GpuBufferBindingType = ["uniform", "storage", "read-only-storage"];

const __wbindgen_enum_GpuPowerPreference = ["low-power", "high-performance"];

const __wbindgen_enum_GpuQueryType = ["occlusion", "timestamp"];

const __wbindgen_enum_GpuSamplerBindingType = ["filtering", "non-filtering", "comparison"];

const __wbindgen_enum_GpuStorageTextureAccess = ["write-only", "read-only", "read-write"];

const __wbindgen_enum_GpuTextureFormat = ["r8unorm", "r8snorm", "r8uint", "r8sint", "r16uint", "r16sint", "r16float", "rg8unorm", "rg8snorm", "rg8uint", "rg8sint", "r32uint", "r32sint", "r32float", "rg16uint", "rg16sint", "rg16float", "rgba8unorm", "rgba8unorm-srgb", "rgba8snorm", "rgba8uint", "rgba8sint", "bgra8unorm", "bgra8unorm-srgb", "rgb9e5ufloat", "rgb10a2uint", "rgb10a2unorm", "rg11b10ufloat", "rg32uint", "rg32sint", "rg32float", "rgba16uint", "rgba16sint", "rgba16float", "rgba32uint", "rgba32sint", "rgba32float", "stencil8", "depth16unorm", "depth24plus", "depth24plus-stencil8", "depth32float", "depth32float-stencil8", "bc1-rgba-unorm", "bc1-rgba-unorm-srgb", "bc2-rgba-unorm", "bc2-rgba-unorm-srgb", "bc3-rgba-unorm", "bc3-rgba-unorm-srgb", "bc4-r-unorm", "bc4-r-snorm", "bc5-rg-unorm", "bc5-rg-snorm", "bc6h-rgb-ufloat", "bc6h-rgb-float", "bc7-rgba-unorm", "bc7-rgba-unorm-srgb", "etc2-rgb8unorm", "etc2-rgb8unorm-srgb", "etc2-rgb8a1unorm", "etc2-rgb8a1unorm-srgb", "etc2-rgba8unorm", "etc2-rgba8unorm-srgb", "eac-r11unorm", "eac-r11snorm", "eac-rg11unorm", "eac-rg11snorm", "astc-4x4-unorm", "astc-4x4-unorm-srgb", "astc-5x4-unorm", "astc-5x4-unorm-srgb", "astc-5x5-unorm", "astc-5x5-unorm-srgb", "astc-6x5-unorm", "astc-6x5-unorm-srgb", "astc-6x6-unorm", "astc-6x6-unorm-srgb", "astc-8x5-unorm", "astc-8x5-unorm-srgb", "astc-8x6-unorm", "astc-8x6-unorm-srgb", "astc-8x8-unorm", "astc-8x8-unorm-srgb", "astc-10x5-unorm", "astc-10x5-unorm-srgb", "astc-10x6-unorm", "astc-10x6-unorm-srgb", "astc-10x8-unorm", "astc-10x8-unorm-srgb", "astc-10x10-unorm", "astc-10x10-unorm-srgb", "astc-12x10-unorm", "astc-12x10-unorm-srgb", "astc-12x12-unorm", "astc-12x12-unorm-srgb"];

const __wbindgen_enum_GpuTextureSampleType = ["float", "unfilterable-float", "depth", "sint", "uint"];

const __wbindgen_enum_GpuTextureViewDimension = ["1d", "2d", "2d-array", "cube", "cube-array", "3d"];

const UpscalerFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_upscaler_free(ptr >>> 0, 1));
/**
 * The image classifier
 */
export class Upscaler {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        UpscalerFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_upscaler_free(ptr, 0);
    }
    /**
     * Constructor called by JavaScripts with the new keyword.
     */
    constructor() {
        const ret = wasm.upscaler_new();
        this.__wbg_ptr = ret >>> 0;
        UpscalerFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Runs inference on the image
     * @param {Float32Array} input
     * @param {number} height
     * @param {number} width
     * @param {number} batch_size
     * @param {number} patch_size
     * @param {number} padding
     * @param {number} pad_size
     * @returns {Promise<Uint8Array>}
     */
    inference(input, height, width, batch_size, patch_size, padding, pad_size) {
        if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.__wbg_ptr);
        const ptr0 = passArrayF32ToWasm0(input, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        _assertNum(height);
        _assertNum(width);
        _assertNum(batch_size);
        _assertNum(patch_size);
        _assertNum(padding);
        _assertNum(pad_size);
        const ret = wasm.upscaler_inference(this.__wbg_ptr, ptr0, len0, height, width, batch_size, patch_size, padding, pad_size);
        return ret;
    }
    /**
     * Sets the backend to NdArray
     * @returns {Promise<void>}
     */
    set_backend_ndarray() {
        if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.__wbg_ptr);
        const ret = wasm.upscaler_set_backend_ndarray(this.__wbg_ptr);
        return ret;
    }
    /**
     * Sets the backend to Wgpu f32
     * @returns {Promise<void>}
     */
    set_backend_wgpu_f32() {
        if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.__wbg_ptr);
        const ret = wasm.upscaler_set_backend_wgpu_f32(this.__wbg_ptr);
        return ret;
    }
    /**
     * Sets the backend to Wgpu f16
     * @returns {Promise<void>}
     */
    set_backend_wgpu_f16() {
        if (this.__wbg_ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.__wbg_ptr);
        const ret = wasm.upscaler_set_backend_wgpu_f16(this.__wbg_ptr);
        return ret;
    }
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);

            } catch (e) {
                if (module.headers.get('Content-Type') != 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else {
                    throw e;
                }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);

    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };

        } else {
            return instance;
        }
    }
}

function __wbg_get_imports() {
    const imports = {};
    imports.wbg = {};
    imports.wbg.__wbg_Window_012086356a161dce = function() { return logError(function (arg0) {
        const ret = arg0.Window;
        return ret;
    }, arguments) };
    imports.wbg.__wbg_WorkerGlobalScope_dbe19b83176b742b = function() { return logError(function (arg0) {
        const ret = arg0.WorkerGlobalScope;
        return ret;
    }, arguments) };
    imports.wbg.__wbg_beginComputePass_eb489d88a5327674 = function() { return logError(function (arg0, arg1) {
        const ret = arg0.beginComputePass(arg1);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_buffer_09165b52af8c5237 = function() { return logError(function (arg0) {
        const ret = arg0.buffer;
        return ret;
    }, arguments) };
    imports.wbg.__wbg_buffer_609cc3eee51ed158 = function() { return logError(function (arg0) {
        const ret = arg0.buffer;
        return ret;
    }, arguments) };
    imports.wbg.__wbg_call_672a4d21634d4a24 = function() { return handleError(function (arg0, arg1) {
        const ret = arg0.call(arg1);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_call_7cccdd69e0791ae2 = function() { return handleError(function (arg0, arg1, arg2) {
        const ret = arg0.call(arg1, arg2);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_copyBufferToBuffer_6fe483ce4a07f7c8 = function() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5) {
        arg0.copyBufferToBuffer(arg1, arg2, arg3, arg4, arg5);
    }, arguments) };
    imports.wbg.__wbg_createBindGroupLayout_ccaa5d2aa2a2ae17 = function() { return handleError(function (arg0, arg1) {
        const ret = arg0.createBindGroupLayout(arg1);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_createBindGroup_799a4c63deccf40c = function() { return logError(function (arg0, arg1) {
        const ret = arg0.createBindGroup(arg1);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_createBuffer_a19c4c09aa7e61c6 = function() { return handleError(function (arg0, arg1) {
        const ret = arg0.createBuffer(arg1);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_createCommandEncoder_3c9ad92fb9f1235d = function() { return logError(function (arg0, arg1) {
        const ret = arg0.createCommandEncoder(arg1);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_createComputePipeline_5bc685ade9b4da65 = function() { return logError(function (arg0, arg1) {
        const ret = arg0.createComputePipeline(arg1);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_createPipelineLayout_0718a3eb9884dcfb = function() { return logError(function (arg0, arg1) {
        const ret = arg0.createPipelineLayout(arg1);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_createQuerySet_d6541ea3488cdff3 = function() { return handleError(function (arg0, arg1) {
        const ret = arg0.createQuerySet(arg1);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_createShaderModule_9e08b1b6ae277929 = function() { return logError(function (arg0, arg1) {
        const ret = arg0.createShaderModule(arg1);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_debug_e17b51583ca6a632 = function() { return logError(function (arg0, arg1, arg2, arg3) {
        console.debug(arg0, arg1, arg2, arg3);
    }, arguments) };
    imports.wbg.__wbg_dispatchWorkgroupsIndirect_a08a26c640f286e2 = function() { return logError(function (arg0, arg1, arg2) {
        arg0.dispatchWorkgroupsIndirect(arg1, arg2);
    }, arguments) };
    imports.wbg.__wbg_dispatchWorkgroups_fad6ffff4d7bf751 = function() { return logError(function (arg0, arg1, arg2, arg3) {
        arg0.dispatchWorkgroups(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0);
    }, arguments) };
    imports.wbg.__wbg_end_4afeb869c57e2895 = function() { return logError(function (arg0) {
        arg0.end();
    }, arguments) };
    imports.wbg.__wbg_error_524f506f44df1645 = function() { return logError(function (arg0) {
        console.error(arg0);
    }, arguments) };
    imports.wbg.__wbg_error_7534b8e9a36f1ab4 = function() { return logError(function (arg0, arg1) {
        let deferred0_0;
        let deferred0_1;
        try {
            deferred0_0 = arg0;
            deferred0_1 = arg1;
            console.error(getStringFromWasm0(arg0, arg1));
        } finally {
            wasm.__wbindgen_free(deferred0_0, deferred0_1, 1);
        }
    }, arguments) };
    imports.wbg.__wbg_error_80de38b3f7cc3c3c = function() { return logError(function (arg0, arg1, arg2, arg3) {
        console.error(arg0, arg1, arg2, arg3);
    }, arguments) };
    imports.wbg.__wbg_features_06c1298a671dd8a3 = function() { return logError(function (arg0) {
        const ret = arg0.features;
        return ret;
    }, arguments) };
    imports.wbg.__wbg_features_ea2949142684633e = function() { return logError(function (arg0) {
        const ret = arg0.features;
        return ret;
    }, arguments) };
    imports.wbg.__wbg_finish_0169ed1c762f9db3 = function() { return logError(function (arg0) {
        const ret = arg0.finish();
        return ret;
    }, arguments) };
    imports.wbg.__wbg_finish_10ad953096805038 = function() { return logError(function (arg0, arg1) {
        const ret = arg0.finish(arg1);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_getBindGroupLayout_40cd8989f50be5e8 = function() { return logError(function (arg0, arg1) {
        const ret = arg0.getBindGroupLayout(arg1 >>> 0);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_getMappedRange_6d2048e506f70687 = function() { return handleError(function (arg0, arg1, arg2) {
        const ret = arg0.getMappedRange(arg1, arg2);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_getRandomValues_21a0191e74d0e1d3 = function() { return handleError(function (arg0, arg1) {
        globalThis.crypto.getRandomValues(getArrayU8FromWasm0(arg0, arg1));
    }, arguments) };
    imports.wbg.__wbg_gpu_9190c45d483af352 = function() { return logError(function (arg0) {
        const ret = arg0.gpu;
        return ret;
    }, arguments) };
    imports.wbg.__wbg_has_bd26e8330abc96fb = function() { return logError(function (arg0, arg1, arg2) {
        const ret = arg0.has(getStringFromWasm0(arg1, arg2));
        _assertBoolean(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_info_033d8b8a0838f1d3 = function() { return logError(function (arg0, arg1, arg2, arg3) {
        console.info(arg0, arg1, arg2, arg3);
    }, arguments) };
    imports.wbg.__wbg_instanceof_GpuAdapter_0e209d47dbec389c = function() { return logError(function (arg0) {
        let result;
        try {
            result = arg0 instanceof GPUAdapter;
        } catch (_) {
            result = false;
        }
        const ret = result;
        _assertBoolean(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_label_1f84f92f09ba5b0a = function() { return logError(function (arg0, arg1) {
        const ret = arg1.label;
        const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    }, arguments) };
    imports.wbg.__wbg_length_a446193dc22c12f8 = function() { return logError(function (arg0) {
        const ret = arg0.length;
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_limits_b183be320685ed8f = function() { return logError(function (arg0) {
        const ret = arg0.limits;
        return ret;
    }, arguments) };
    imports.wbg.__wbg_limits_e57569af160aeddc = function() { return logError(function (arg0) {
        const ret = arg0.limits;
        return ret;
    }, arguments) };
    imports.wbg.__wbg_log_cad59bb680daec67 = function() { return logError(function (arg0, arg1, arg2, arg3) {
        console.log(arg0, arg1, arg2, arg3);
    }, arguments) };
    imports.wbg.__wbg_mapAsync_6c6e4e801161924c = function() { return logError(function (arg0, arg1, arg2, arg3) {
        const ret = arg0.mapAsync(arg1 >>> 0, arg2, arg3);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_maxBindGroups_38117bf16c093492 = function() { return logError(function (arg0) {
        const ret = arg0.maxBindGroups;
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_maxBindingsPerBindGroup_4c83aa7d3b0f0bf9 = function() { return logError(function (arg0) {
        const ret = arg0.maxBindingsPerBindGroup;
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_maxBufferSize_0476342fcdb63944 = function() { return logError(function (arg0) {
        const ret = arg0.maxBufferSize;
        return ret;
    }, arguments) };
    imports.wbg.__wbg_maxColorAttachmentBytesPerSample_dd065943c2c074c9 = function() { return logError(function (arg0) {
        const ret = arg0.maxColorAttachmentBytesPerSample;
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_maxColorAttachments_cdd33ae159d907c3 = function() { return logError(function (arg0) {
        const ret = arg0.maxColorAttachments;
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_maxComputeInvocationsPerWorkgroup_f18a0e7cc360a4f2 = function() { return logError(function (arg0) {
        const ret = arg0.maxComputeInvocationsPerWorkgroup;
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_maxComputeWorkgroupSizeX_c8a05f62d09395f4 = function() { return logError(function (arg0) {
        const ret = arg0.maxComputeWorkgroupSizeX;
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_maxComputeWorkgroupSizeY_749851b448366c6b = function() { return logError(function (arg0) {
        const ret = arg0.maxComputeWorkgroupSizeY;
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_maxComputeWorkgroupSizeZ_c53cc29df955ae5a = function() { return logError(function (arg0) {
        const ret = arg0.maxComputeWorkgroupSizeZ;
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_maxComputeWorkgroupStorageSize_1b473a4049c8b908 = function() { return logError(function (arg0) {
        const ret = arg0.maxComputeWorkgroupStorageSize;
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_maxComputeWorkgroupsPerDimension_9ff46dd341f1489f = function() { return logError(function (arg0) {
        const ret = arg0.maxComputeWorkgroupsPerDimension;
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_maxDynamicStorageBuffersPerPipelineLayout_6f2531c8b3946fe7 = function() { return logError(function (arg0) {
        const ret = arg0.maxDynamicStorageBuffersPerPipelineLayout;
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_maxDynamicUniformBuffersPerPipelineLayout_6532ba0f61691f92 = function() { return logError(function (arg0) {
        const ret = arg0.maxDynamicUniformBuffersPerPipelineLayout;
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_maxSampledTexturesPerShaderStage_1e300c1893a44019 = function() { return logError(function (arg0) {
        const ret = arg0.maxSampledTexturesPerShaderStage;
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_maxSamplersPerShaderStage_b2f4886a8bf432e9 = function() { return logError(function (arg0) {
        const ret = arg0.maxSamplersPerShaderStage;
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_maxStorageBufferBindingSize_1664cce2578d8011 = function() { return logError(function (arg0) {
        const ret = arg0.maxStorageBufferBindingSize;
        return ret;
    }, arguments) };
    imports.wbg.__wbg_maxStorageBuffersPerShaderStage_41c3a49271bb26d0 = function() { return logError(function (arg0) {
        const ret = arg0.maxStorageBuffersPerShaderStage;
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_maxStorageTexturesPerShaderStage_090ef077886867b7 = function() { return logError(function (arg0) {
        const ret = arg0.maxStorageTexturesPerShaderStage;
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_maxTextureArrayLayers_6ad2737805de682c = function() { return logError(function (arg0) {
        const ret = arg0.maxTextureArrayLayers;
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_maxTextureDimension1D_f034b80a9155ce7a = function() { return logError(function (arg0) {
        const ret = arg0.maxTextureDimension1D;
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_maxTextureDimension2D_97d03cbc330a1de6 = function() { return logError(function (arg0) {
        const ret = arg0.maxTextureDimension2D;
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_maxTextureDimension3D_9cb354a662c690a7 = function() { return logError(function (arg0) {
        const ret = arg0.maxTextureDimension3D;
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_maxUniformBufferBindingSize_376fb4aa02284b9b = function() { return logError(function (arg0) {
        const ret = arg0.maxUniformBufferBindingSize;
        return ret;
    }, arguments) };
    imports.wbg.__wbg_maxUniformBuffersPerShaderStage_77c6612a2878a56b = function() { return logError(function (arg0) {
        const ret = arg0.maxUniformBuffersPerShaderStage;
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_maxVertexAttributes_0a768d9af99844e2 = function() { return logError(function (arg0) {
        const ret = arg0.maxVertexAttributes;
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_maxVertexBufferArrayStride_3c84c7f70e4ce587 = function() { return logError(function (arg0) {
        const ret = arg0.maxVertexBufferArrayStride;
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_maxVertexBuffers_ddcf4555a965d888 = function() { return logError(function (arg0) {
        const ret = arg0.maxVertexBuffers;
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_minStorageBufferOffsetAlignment_630d33ba02e6ace7 = function() { return logError(function (arg0) {
        const ret = arg0.minStorageBufferOffsetAlignment;
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_minUniformBufferOffsetAlignment_ed951280a2dc56cd = function() { return logError(function (arg0) {
        const ret = arg0.minUniformBufferOffsetAlignment;
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_navigator_0a9bf1120e24fec2 = function() { return logError(function (arg0) {
        const ret = arg0.navigator;
        return ret;
    }, arguments) };
    imports.wbg.__wbg_navigator_1577371c070c8947 = function() { return logError(function (arg0) {
        const ret = arg0.navigator;
        return ret;
    }, arguments) };
    imports.wbg.__wbg_new_23a2665fac83c611 = function() { return logError(function (arg0, arg1) {
        try {
            var state0 = {a: arg0, b: arg1};
            var cb0 = (arg0, arg1) => {
                const a = state0.a;
                state0.a = 0;
                try {
                    return __wbg_adapter_325(a, state0.b, arg0, arg1);
                } finally {
                    state0.a = a;
                }
            };
            const ret = new Promise(cb0);
            return ret;
        } finally {
            state0.a = state0.b = 0;
        }
    }, arguments) };
    imports.wbg.__wbg_new_405e22f390576ce2 = function() { return logError(function () {
        const ret = new Object();
        return ret;
    }, arguments) };
    imports.wbg.__wbg_new_78feb108b6472713 = function() { return logError(function () {
        const ret = new Array();
        return ret;
    }, arguments) };
    imports.wbg.__wbg_new_8a6f238a6ece86ea = function() { return logError(function () {
        const ret = new Error();
        return ret;
    }, arguments) };
    imports.wbg.__wbg_new_a12002a7f91c75be = function() { return logError(function (arg0) {
        const ret = new Uint8Array(arg0);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_newnoargs_105ed471475aaf50 = function() { return logError(function (arg0, arg1) {
        const ret = new Function(getStringFromWasm0(arg0, arg1));
        return ret;
    }, arguments) };
    imports.wbg.__wbg_newwithbyteoffsetandlength_d97e637ebe145a9a = function() { return logError(function (arg0, arg1, arg2) {
        const ret = new Uint8Array(arg0, arg1 >>> 0, arg2 >>> 0);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_now_2c95c9de01293173 = function() { return logError(function (arg0) {
        const ret = arg0.now();
        return ret;
    }, arguments) };
    imports.wbg.__wbg_performance_7a3ffd0b17f663ad = function() { return logError(function (arg0) {
        const ret = arg0.performance;
        return ret;
    }, arguments) };
    imports.wbg.__wbg_push_737cfc8c1432c2c6 = function() { return logError(function (arg0, arg1) {
        const ret = arg0.push(arg1);
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_queueMicrotask_97d92b4fcc8a61c5 = function() { return logError(function (arg0) {
        queueMicrotask(arg0);
    }, arguments) };
    imports.wbg.__wbg_queueMicrotask_d3219def82552485 = function() { return logError(function (arg0) {
        const ret = arg0.queueMicrotask;
        return ret;
    }, arguments) };
    imports.wbg.__wbg_queue_d89a02421bda2b42 = function() { return logError(function (arg0) {
        const ret = arg0.queue;
        return ret;
    }, arguments) };
    imports.wbg.__wbg_requestAdapter_aa6a84b375129705 = function() { return logError(function (arg0, arg1) {
        const ret = arg0.requestAdapter(arg1);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_requestDevice_c5987173ae76ad9e = function() { return logError(function (arg0, arg1) {
        const ret = arg0.requestDevice(arg1);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_resolveQuerySet_73c30ae026708ae3 = function() { return logError(function (arg0, arg1, arg2, arg3, arg4, arg5) {
        arg0.resolveQuerySet(arg1, arg2 >>> 0, arg3 >>> 0, arg4, arg5 >>> 0);
    }, arguments) };
    imports.wbg.__wbg_resolve_4851785c9c5f573d = function() { return logError(function (arg0) {
        const ret = Promise.resolve(arg0);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_setBindGroup_ab1792567210b45e = function() { return logError(function (arg0, arg1, arg2) {
        arg0.setBindGroup(arg1 >>> 0, arg2);
    }, arguments) };
    imports.wbg.__wbg_setBindGroup_fc1389bb99633d8c = function() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
        arg0.setBindGroup(arg1 >>> 0, arg2, getArrayU32FromWasm0(arg3, arg4), arg5, arg6 >>> 0);
    }, arguments) };
    imports.wbg.__wbg_setPipeline_87ad5324dddd196b = function() { return logError(function (arg0, arg1) {
        arg0.setPipeline(arg1);
    }, arguments) };
    imports.wbg.__wbg_set_65595bdd868b3009 = function() { return logError(function (arg0, arg1, arg2) {
        arg0.set(arg1, arg2 >>> 0);
    }, arguments) };
    imports.wbg.__wbg_set_bb8cecf6a62b9f46 = function() { return handleError(function (arg0, arg1, arg2) {
        const ret = Reflect.set(arg0, arg1, arg2);
        _assertBoolean(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_setaccess_7a29a6624061bd22 = function() { return logError(function (arg0, arg1) {
        arg0.access = __wbindgen_enum_GpuStorageTextureAccess[arg1];
    }, arguments) };
    imports.wbg.__wbg_setbeginningofpasswriteindex_bbb0050c1b81621d = function() { return logError(function (arg0, arg1) {
        arg0.beginningOfPassWriteIndex = arg1 >>> 0;
    }, arguments) };
    imports.wbg.__wbg_setbindgrouplayouts_a2670a6cfcb7c490 = function() { return logError(function (arg0, arg1) {
        arg0.bindGroupLayouts = arg1;
    }, arguments) };
    imports.wbg.__wbg_setbinding_d47488349a99da1f = function() { return logError(function (arg0, arg1) {
        arg0.binding = arg1 >>> 0;
    }, arguments) };
    imports.wbg.__wbg_setbinding_f935678f007077c3 = function() { return logError(function (arg0, arg1) {
        arg0.binding = arg1 >>> 0;
    }, arguments) };
    imports.wbg.__wbg_setbuffer_6b2d0975dd5b4804 = function() { return logError(function (arg0, arg1) {
        arg0.buffer = arg1;
    }, arguments) };
    imports.wbg.__wbg_setbuffer_8953e54ed1e614bf = function() { return logError(function (arg0, arg1) {
        arg0.buffer = arg1;
    }, arguments) };
    imports.wbg.__wbg_setcode_0f3b7e02272be293 = function() { return logError(function (arg0, arg1, arg2) {
        arg0.code = getStringFromWasm0(arg1, arg2);
    }, arguments) };
    imports.wbg.__wbg_setcompute_f3044d1d00931db2 = function() { return logError(function (arg0, arg1) {
        arg0.compute = arg1;
    }, arguments) };
    imports.wbg.__wbg_setcount_83ad4bd80b61ff13 = function() { return logError(function (arg0, arg1) {
        arg0.count = arg1 >>> 0;
    }, arguments) };
    imports.wbg.__wbg_setendofpasswriteindex_82d6d163d760be28 = function() { return logError(function (arg0, arg1) {
        arg0.endOfPassWriteIndex = arg1 >>> 0;
    }, arguments) };
    imports.wbg.__wbg_setentries_31f9d7a61735820c = function() { return logError(function (arg0, arg1) {
        arg0.entries = arg1;
    }, arguments) };
    imports.wbg.__wbg_setentries_c4c1438ed3550798 = function() { return logError(function (arg0, arg1) {
        arg0.entries = arg1;
    }, arguments) };
    imports.wbg.__wbg_setentrypoint_cc0ef6995eb4ec8a = function() { return logError(function (arg0, arg1, arg2) {
        arg0.entryPoint = getStringFromWasm0(arg1, arg2);
    }, arguments) };
    imports.wbg.__wbg_setformat_999b10709ff9fbb3 = function() { return logError(function (arg0, arg1) {
        arg0.format = __wbindgen_enum_GpuTextureFormat[arg1];
    }, arguments) };
    imports.wbg.__wbg_sethasdynamicoffset_cb46ff65a09728e7 = function() { return logError(function (arg0, arg1) {
        arg0.hasDynamicOffset = arg1 !== 0;
    }, arguments) };
    imports.wbg.__wbg_setlabel_288008e3764fd03d = function() { return logError(function (arg0, arg1, arg2) {
        arg0.label = getStringFromWasm0(arg1, arg2);
    }, arguments) };
    imports.wbg.__wbg_setlabel_2b771b9d670d425d = function() { return logError(function (arg0, arg1, arg2) {
        arg0.label = getStringFromWasm0(arg1, arg2);
    }, arguments) };
    imports.wbg.__wbg_setlabel_2da44266df5c13ed = function() { return logError(function (arg0, arg1, arg2) {
        arg0.label = getStringFromWasm0(arg1, arg2);
    }, arguments) };
    imports.wbg.__wbg_setlabel_500d4bf5cd901261 = function() { return logError(function (arg0, arg1, arg2) {
        arg0.label = getStringFromWasm0(arg1, arg2);
    }, arguments) };
    imports.wbg.__wbg_setlabel_a500f3f38501fd17 = function() { return logError(function (arg0, arg1, arg2) {
        arg0.label = getStringFromWasm0(arg1, arg2);
    }, arguments) };
    imports.wbg.__wbg_setlabel_a715a723e54be347 = function() { return logError(function (arg0, arg1, arg2) {
        arg0.label = getStringFromWasm0(arg1, arg2);
    }, arguments) };
    imports.wbg.__wbg_setlabel_d9721be24ba962d0 = function() { return logError(function (arg0, arg1, arg2) {
        arg0.label = getStringFromWasm0(arg1, arg2);
    }, arguments) };
    imports.wbg.__wbg_setlabel_e628a8506e7dbad1 = function() { return logError(function (arg0, arg1, arg2) {
        arg0.label = getStringFromWasm0(arg1, arg2);
    }, arguments) };
    imports.wbg.__wbg_setlabel_ee195a522e4e446e = function() { return logError(function (arg0, arg1, arg2) {
        arg0.label = getStringFromWasm0(arg1, arg2);
    }, arguments) };
    imports.wbg.__wbg_setlabel_f63950a596f3822e = function() { return logError(function (arg0, arg1, arg2) {
        arg0.label = getStringFromWasm0(arg1, arg2);
    }, arguments) };
    imports.wbg.__wbg_setlabel_f83545b14d4230ba = function() { return logError(function (arg0, arg1, arg2) {
        arg0.label = getStringFromWasm0(arg1, arg2);
    }, arguments) };
    imports.wbg.__wbg_setlayout_07cd9903ecafe648 = function() { return logError(function (arg0, arg1) {
        arg0.layout = arg1;
    }, arguments) };
    imports.wbg.__wbg_setlayout_65212cfcdc8328fc = function() { return logError(function (arg0, arg1) {
        arg0.layout = arg1;
    }, arguments) };
    imports.wbg.__wbg_setmappedatcreation_a8895d0463a7c2b4 = function() { return logError(function (arg0, arg1) {
        arg0.mappedAtCreation = arg1 !== 0;
    }, arguments) };
    imports.wbg.__wbg_setminbindingsize_e6ebb4f885a7e096 = function() { return logError(function (arg0, arg1) {
        arg0.minBindingSize = arg1;
    }, arguments) };
    imports.wbg.__wbg_setmodule_9c6fb60dbbaf9ff6 = function() { return logError(function (arg0, arg1) {
        arg0.module = arg1;
    }, arguments) };
    imports.wbg.__wbg_setmultisampled_5bbeb86cec3c3b77 = function() { return logError(function (arg0, arg1) {
        arg0.multisampled = arg1 !== 0;
    }, arguments) };
    imports.wbg.__wbg_setoffset_faa7816201305e71 = function() { return logError(function (arg0, arg1) {
        arg0.offset = arg1;
    }, arguments) };
    imports.wbg.__wbg_setpowerpreference_f55bb01532e63a16 = function() { return logError(function (arg0, arg1) {
        arg0.powerPreference = __wbindgen_enum_GpuPowerPreference[arg1];
    }, arguments) };
    imports.wbg.__wbg_setqueryset_840dc8940d3be049 = function() { return logError(function (arg0, arg1) {
        arg0.querySet = arg1;
    }, arguments) };
    imports.wbg.__wbg_setrequiredfeatures_4aaba5b9bed02f6c = function() { return logError(function (arg0, arg1) {
        arg0.requiredFeatures = arg1;
    }, arguments) };
    imports.wbg.__wbg_setresource_da805678f095daba = function() { return logError(function (arg0, arg1) {
        arg0.resource = arg1;
    }, arguments) };
    imports.wbg.__wbg_setsampler_907171f78b25e6a0 = function() { return logError(function (arg0, arg1) {
        arg0.sampler = arg1;
    }, arguments) };
    imports.wbg.__wbg_setsampletype_128e447eb57f81e0 = function() { return logError(function (arg0, arg1) {
        arg0.sampleType = __wbindgen_enum_GpuTextureSampleType[arg1];
    }, arguments) };
    imports.wbg.__wbg_setsize_26f6f424f8c7ad78 = function() { return logError(function (arg0, arg1) {
        arg0.size = arg1;
    }, arguments) };
    imports.wbg.__wbg_setsize_77e119b004938be3 = function() { return logError(function (arg0, arg1) {
        arg0.size = arg1;
    }, arguments) };
    imports.wbg.__wbg_setstoragetexture_073162508208dde1 = function() { return logError(function (arg0, arg1) {
        arg0.storageTexture = arg1;
    }, arguments) };
    imports.wbg.__wbg_settexture_372c227c16e4476c = function() { return logError(function (arg0, arg1) {
        arg0.texture = arg1;
    }, arguments) };
    imports.wbg.__wbg_settimestampwrites_753fd289d25da0f6 = function() { return logError(function (arg0, arg1) {
        arg0.timestampWrites = arg1;
    }, arguments) };
    imports.wbg.__wbg_settype_2eb0a1e4095d484d = function() { return logError(function (arg0, arg1) {
        arg0.type = __wbindgen_enum_GpuSamplerBindingType[arg1];
    }, arguments) };
    imports.wbg.__wbg_settype_586408d828cb05f9 = function() { return logError(function (arg0, arg1) {
        arg0.type = __wbindgen_enum_GpuBufferBindingType[arg1];
    }, arguments) };
    imports.wbg.__wbg_settype_fb280f77c5aea269 = function() { return logError(function (arg0, arg1) {
        arg0.type = __wbindgen_enum_GpuQueryType[arg1];
    }, arguments) };
    imports.wbg.__wbg_setusage_a9a9e2b9822110e6 = function() { return logError(function (arg0, arg1) {
        arg0.usage = arg1 >>> 0;
    }, arguments) };
    imports.wbg.__wbg_setviewdimension_62541381052220ba = function() { return logError(function (arg0, arg1) {
        arg0.viewDimension = __wbindgen_enum_GpuTextureViewDimension[arg1];
    }, arguments) };
    imports.wbg.__wbg_setviewdimension_cba6f4f08621ab93 = function() { return logError(function (arg0, arg1) {
        arg0.viewDimension = __wbindgen_enum_GpuTextureViewDimension[arg1];
    }, arguments) };
    imports.wbg.__wbg_setvisibility_3f5ec62f823cc88e = function() { return logError(function (arg0, arg1) {
        arg0.visibility = arg1 >>> 0;
    }, arguments) };
    imports.wbg.__wbg_size_f5fdd7af88b0b724 = function() { return logError(function (arg0) {
        const ret = arg0.size;
        return ret;
    }, arguments) };
    imports.wbg.__wbg_stack_0ed75d68575b0f3c = function() { return logError(function (arg0, arg1) {
        const ret = arg1.stack;
        const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    }, arguments) };
    imports.wbg.__wbg_static_accessor_GLOBAL_88a902d13a557d07 = function() { return logError(function () {
        const ret = typeof global === 'undefined' ? null : global;
        return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
    }, arguments) };
    imports.wbg.__wbg_static_accessor_GLOBAL_THIS_56578be7e9f832b0 = function() { return logError(function () {
        const ret = typeof globalThis === 'undefined' ? null : globalThis;
        return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
    }, arguments) };
    imports.wbg.__wbg_static_accessor_SELF_37c5d418e4bf5819 = function() { return logError(function () {
        const ret = typeof self === 'undefined' ? null : self;
        return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
    }, arguments) };
    imports.wbg.__wbg_static_accessor_WINDOW_5de37043a91a9c40 = function() { return logError(function () {
        const ret = typeof window === 'undefined' ? null : window;
        return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
    }, arguments) };
    imports.wbg.__wbg_submit_683667e8c0f18d76 = function() { return logError(function (arg0, arg1) {
        arg0.submit(arg1);
    }, arguments) };
    imports.wbg.__wbg_then_44b73946d2fb3e7d = function() { return logError(function (arg0, arg1) {
        const ret = arg0.then(arg1);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_then_48b406749878a531 = function() { return logError(function (arg0, arg1, arg2) {
        const ret = arg0.then(arg1, arg2);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_unmap_3996f949ebf6b9a4 = function() { return logError(function (arg0) {
        arg0.unmap();
    }, arguments) };
    imports.wbg.__wbg_usage_ef79cc1301f4d456 = function() { return logError(function (arg0) {
        const ret = arg0.usage;
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_warn_aaf1f4664a035bd6 = function() { return logError(function (arg0, arg1, arg2, arg3) {
        console.warn(arg0, arg1, arg2, arg3);
    }, arguments) };
    imports.wbg.__wbg_writeBuffer_54f5faed442e5ab3 = function() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5) {
        arg0.writeBuffer(arg1, arg2, arg3, arg4, arg5);
    }, arguments) };
    imports.wbg.__wbindgen_cb_drop = function(arg0) {
        const obj = arg0.original;
        if (obj.cnt-- == 1) {
            obj.a = 0;
            return true;
        }
        const ret = false;
        _assertBoolean(ret);
        return ret;
    };
    imports.wbg.__wbindgen_closure_wrapper3378 = function() { return logError(function (arg0, arg1, arg2) {
        const ret = makeMutClosure(arg0, arg1, 987, __wbg_adapter_30);
        return ret;
    }, arguments) };
    imports.wbg.__wbindgen_debug_string = function(arg0, arg1) {
        const ret = debugString(arg1);
        const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    };
    imports.wbg.__wbindgen_init_externref_table = function() {
        const table = wasm.__wbindgen_export_2;
        const offset = table.grow(4);
        table.set(0, undefined);
        table.set(offset + 0, undefined);
        table.set(offset + 1, null);
        table.set(offset + 2, true);
        table.set(offset + 3, false);
        ;
    };
    imports.wbg.__wbindgen_is_function = function(arg0) {
        const ret = typeof(arg0) === 'function';
        _assertBoolean(ret);
        return ret;
    };
    imports.wbg.__wbindgen_is_null = function(arg0) {
        const ret = arg0 === null;
        _assertBoolean(ret);
        return ret;
    };
    imports.wbg.__wbindgen_is_undefined = function(arg0) {
        const ret = arg0 === undefined;
        _assertBoolean(ret);
        return ret;
    };
    imports.wbg.__wbindgen_memory = function() {
        const ret = wasm.memory;
        return ret;
    };
    imports.wbg.__wbindgen_number_new = function(arg0) {
        const ret = arg0;
        return ret;
    };
    imports.wbg.__wbindgen_string_get = function(arg0, arg1) {
        const obj = arg1;
        const ret = typeof(obj) === 'string' ? obj : undefined;
        var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len1 = WASM_VECTOR_LEN;
        getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    };
    imports.wbg.__wbindgen_string_new = function(arg0, arg1) {
        const ret = getStringFromWasm0(arg0, arg1);
        return ret;
    };
    imports.wbg.__wbindgen_throw = function(arg0, arg1) {
        throw new Error(getStringFromWasm0(arg0, arg1));
    };
    imports.wbg.__wbindgen_uint8_array_new = function(arg0, arg1) {
        var v0 = getArrayU8FromWasm0(arg0, arg1).slice();
        wasm.__wbindgen_free(arg0, arg1 * 1, 1);
        const ret = v0;
        return ret;
    };

    return imports;
}

function __wbg_init_memory(imports, memory) {

}

function __wbg_finalize_init(instance, module) {
    wasm = instance.exports;
    __wbg_init.__wbindgen_wasm_module = module;
    cachedDataViewMemory0 = null;
    cachedFloat32ArrayMemory0 = null;
    cachedUint32ArrayMemory0 = null;
    cachedUint8ArrayMemory0 = null;


    wasm.__wbindgen_start();
    return wasm;
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (typeof module !== 'undefined') {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();

    __wbg_init_memory(imports);

    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }

    const instance = new WebAssembly.Instance(module, imports);

    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;


    if (typeof module_or_path !== 'undefined') {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (typeof module_or_path === 'undefined') {
        module_or_path = new URL('real_esrgan_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    __wbg_init_memory(imports);

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync };
export default __wbg_init;
