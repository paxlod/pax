// Define the expected input and output payloads
export interface DSPWorkerInput {
  real: Float32Array;
  imag: Float32Array;
}

export interface DSPWorkerOutput {
  real: Float32Array;
  imag: Float32Array;
  magnitudes: Float32Array;
}

self.onmessage = function(e: MessageEvent<DSPWorkerInput>) {
  const { real, imag } = e.data;
  const n = real.length;
  
  // Ensure array length is a power of 2 for Radix-2 FFT
  if ((n & (n - 1)) !== 0) {
    throw new Error("FFT input length must be a power of 2");
  }
  
  const N = n;
  
  // 1. Bit-reversal permutation
  for (let i = 1, j = 0; i < N; i++) {
    let bit = N >> 1;
    for (; j & bit; bit >>= 1) {
      j ^= bit;
    }
    j ^= bit;
    if (i < j) {
      let tempR = real[i], tempI = imag[i];
      real[i] = real[j]; imag[i] = imag[j];
      real[j] = tempR; imag[j] = tempI;
    }
  }
  
  // 2. Cooley-Tukey Radix-2 Core
  for (let len = 2; len <= N; len <<= 1) {
    let angle = -2 * Math.PI / len;
    let wlen_r = Math.cos(angle), wlen_i = Math.sin(angle);
    for (let i = 0; i < N; i += len) {
      let w_r = 1, w_i = 0;
      for (let j = 0; j < len / 2; j++) {
        let u_r = real[i + j], u_i = imag[i + j];
        let v_r = real[i + j + len / 2] * w_r - imag[i + j + len / 2] * w_i;
        let v_i = real[i + j + len / 2] * w_i + imag[i + j + len / 2] * w_r;
        
        real[i + j] = u_r + v_r;
        imag[i + j] = u_i + v_i;
        real[i + j + len / 2] = u_r - v_r;
        imag[i + j + len / 2] = u_i - v_i;
        
        let next_w_r = w_r * wlen_r - w_i * wlen_i;
        let next_w_i = w_r * wlen_i + w_i * wlen_r;
        w_r = next_w_r;
        w_i = next_w_i;
      }
    }
  }

  // 3. Calculate magnitudes for easy spectrogram mapping
  // Actually, WebGL usually maps low freq at bottom, so N/2 magnitudes.
  const magnitudes = new Float32Array(N / 2);
  for (let i = 0; i < N / 2; i++) {
    magnitudes[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
  }
  
  // Post back to main thread, transferring buffers to avoid copy overhead
  self.postMessage(
    { real, imag, magnitudes } as DSPWorkerOutput, 
    [real.buffer, imag.buffer, magnitudes.buffer] as any
  );
};
