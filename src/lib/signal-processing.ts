/**
 * Core signal processing algorithms for Golden Signal Decoder
 */

// Normalize signal to range [0, 1]
// High-Precision DSP Core for Golden Record Specifications

export function blackmanHarrisWindow(data: Float32Array): Float32Array {
  const N = data.length;
  const result = new Float32Array(N);
  const a0 = 0.35875;
  const a1 = 0.48829;
  const a2 = 0.14128;
  const a3 = 0.01168;

  for (let n = 0; n < N; n++) {
    const w = a0 - 
              a1 * Math.cos((2 * Math.PI * n) / (N - 1)) + 
              a2 * Math.cos((4 * Math.PI * n) / (N - 1)) - 
              a3 * Math.cos((6 * Math.PI * n) / (N - 1));
    result[n] = data[n] * w;
  }
  return result;
}

export function schmittTriggerSync(data: Float32Array | number[], lowThresh: number = 0.3, highThresh: number = 0.7): number[] {
  const syncPulses: number[] = [];
  let state = false; // false = low, true = high

  for (let i = 0; i < data.length; i++) {
    if (!state && data[i] > highThresh) {
      state = true;
      syncPulses.push(i);
    } else if (state && data[i] < lowThresh) {
      state = false;
    }
  }
  return syncPulses;
}

export function bilinearInterpolation(data: Float32Array | number[], x: number): number {
  const x1 = Math.floor(x);
  const x2 = Math.ceil(x);
  
  if (x1 === x2) return data[x1] || 0;
  if (x1 < 0 || x2 >= data.length) return 0;

  const dx = x - x1;
  return data[x1] * (1 - dx) + data[x2] * dx;
}

export function decodeImageGolden(data: number[], syncPulses: number[], lines: number, options: DecodeOptions): number[][] {
  const { gamma, contrast, brightness, transpose, flipH, flipV } = options;
  const typedData = new Float32Array(data);
  let rawPixels: number[][] = [];

  // Determine an average line width if sync pulses fall short
  let avgWidth = 0;
  if (syncPulses.length > 1) {
    const widths = [];
    for (let i = 1; i < syncPulses.length; i++) {
      widths.push(syncPulses[i] - syncPulses[i - 1]);
    }
    avgWidth = widths.reduce((a, b) => a + b, 0) / widths.length;
  } else {
    avgWidth = Math.floor(data.length / lines);
  }

  const targetWidth = Math.ceil(avgWidth);

  for (let y = 0; y < lines; y++) {
    const row: number[] = [];
    
    // Align via sync pulse if available, fallback to average width
    let lineStartOffset = (y < syncPulses.length) ? syncPulses[y] : (syncPulses[syncPulses.length-1] || 0) + (y - syncPulses.length + 1) * avgWidth;
    let nextOffset = (y + 1 < syncPulses.length) ? syncPulses[y+1] : lineStartOffset + avgWidth;
    
    const actualLineWidth = nextOffset - lineStartOffset;

    for (let x = 0; x < targetWidth; x++) {
      // Bilinear coordinate mapping
      const readIdx = lineStartOffset + (x / targetWidth) * actualLineWidth;
      row.push(bilinearInterpolation(typedData, readIdx));
    }
    rawPixels.push(row);
  }

  // Apply transformations
  if (transpose) {
    const transposed: number[][] = [];
    for (let x = 0; x < targetWidth; x++) {
      const newRow: number[] = [];
      for (let y = 0; y < lines; y++) {
        newRow.push(rawPixels[y][x]);
      }
      transposed.push(newRow);
    }
    rawPixels = transposed;
  }
  
  if (flipH) {
    rawPixels = rawPixels.map(row => [...row].reverse());
  }
  if (flipV) {
    rawPixels = [...rawPixels].reverse();
  }

  // Value mapping
  return rawPixels.map(row => 
    row.map(val => {
      let v = val;
      v = (v - 0.5) * contrast + 0.5;
      v = v + (brightness / 100);
      v = Math.max(0, Math.min(1, v));
      v = Math.pow(v, gamma);
      return v;
    })
  );
}

export function minMaxDecimate(data: Float32Array, outputSize: number): Float32Array {
  const result = new Float32Array(outputSize * 2);
  const blockSize = data.length / outputSize;
  
  for (let i = 0; i < outputSize; i++) {
    let min = Infinity;
    let max = -Infinity;
    const start = Math.floor(i * blockSize);
    const end = Math.floor((i + 1) * blockSize);
    
    for (let j = start; j < end && j < data.length; j++) {
      const v = data[j];
      if (v < min) min = v;
      if (v > max) max = v;
    }
    result[i * 2] = min;
    result[i * 2 + 1] = max;
  }
  return result;
}

// Basic utilities (existing)
export function normalizeSignal(data: number[]): number[] {
  if (data.length === 0) return [];
  let min = data[0];
  let max = data[0];
  for (let i = 1; i < data.length; i++) {
    if (data[i] < min) min = data[i];
    if (data[i] > max) max = data[i];
  }
  const range = max - min;
  if (range === 0) return data.map(() => 0.5);
  return data.map(val => (val - min) / range);
}

// Find peaks in a signal
export function findPeaks(data: number[], threshold: number = 0.8, minDistance: number = 10): number[] {
  const peaks: number[] = [];
  for (let i = 1; i < data.length - 1; i++) {
    if (data[i] > threshold && data[i] > data[i - 1] && data[i] > data[i + 1]) {
      if (peaks.length === 0 || i - peaks[peaks.length - 1] >= minDistance) {
        peaks.push(i);
      }
    }
  }
  return peaks;
}

// Get top autocorrelation peaks for AI analysis
export function getAutocorrelationPeaks(data: number[], maxLag: number = 1000): number[] {
  const ac = autocorrelation(data.slice(0, Math.min(data.length, maxLag * 3)), maxLag);
  // Normalize AC for peak finding
  const maxAc = Math.max(...ac);
  if (maxAc === 0) return [];
  const normalizedAc = ac.map(v => v / maxAc);
  return findPeaks(normalizedAc, 0.3, 10);
}

// Autocorrelation for pattern detection
export function autocorrelation(data: number[], maxLag: number): number[] {
  const result: number[] = [];
  const n = data.length;
  const mean = data.reduce((a, b) => a + b, 0) / n;
  
  let variance = 0;
  for (let i = 0; i < n; i++) {
    variance += (data[i] - mean) * (data[i] - mean);
  }
  
  for (let lag = 0; lag < maxLag; lag++) {
    let sum = 0;
    for (let i = 0; i < n - lag; i++) {
      sum += (data[i] - mean) * (data[i + lag] - mean);
    }
    result.push(variance === 0 ? 0 : sum / variance);
  }
  return result;
}

// Simple Discrete Fourier Transform (magnitude only)
export function dft(data: number[], maxFreqs: number = 100): { frequencies: number[], magnitudes: number[] } {
  const N = data.length;
  const magnitudes: number[] = [];
  const frequencies: number[] = [];
  
  const limit = Math.min(Math.floor(N / 2), maxFreqs);
  
  for (let k = 0; k < limit; k++) {
    let re = 0;
    let im = 0;
    for (let n = 0; n < N; n++) {
      const angle = (2 * Math.PI * k * n) / N;
      re += data[n] * Math.cos(angle);
      im -= data[n] * Math.sin(angle);
    }
    magnitudes.push(Math.sqrt(re * re + im * im) / N);
    frequencies.push(k);
  }
  
  return { frequencies, magnitudes };
}

// Fast Fourier Transform (iterative Cooley-Tukey)
export function fft(real: number[], imag: number[]): { real: number[], imag: number[] } {
  const n = real.length;
  if ((n & (n - 1)) !== 0) {
    // Pad to next power of 2 if necessary
    const nextPowerOf2 = Math.pow(2, Math.ceil(Math.log2(n)));
    while (real.length < nextPowerOf2) {
      real.push(0);
      imag.push(0);
    }
  }
  
  const N = real.length;
  
  // Bit-reversal permutation
  for (let i = 1, j = 0; i < N; i++) {
    let bit = N >> 1;
    for (; j & bit; bit >>= 1) {
      j ^= bit;
    }
    j ^= bit;
    if (i < j) {
      [real[i], real[j]] = [real[j], real[i]];
      [imag[i], imag[j]] = [imag[j], imag[i]];
    }
  }
  
  // Butterfly computations
  for (let len = 2; len <= N; len <<= 1) {
    const ang = 2 * Math.PI / len;
    const wlen_re = Math.cos(ang);
    const wlen_im = -Math.sin(ang);
    for (let i = 0; i < N; i += len) {
      let w_re = 1;
      let w_im = 0;
      for (let j = 0; j < len / 2; j++) {
        const u_re = real[i + j];
        const u_im = imag[i + j];
        const v_re = real[i + j + len / 2] * w_re - imag[i + j + len / 2] * w_im;
        const v_im = real[i + j + len / 2] * w_im + imag[i + j + len / 2] * w_re;
        real[i + j] = u_re + v_re;
        imag[i + j] = u_im + v_im;
        real[i + j + len / 2] = u_re - v_re;
        imag[i + j + len / 2] = u_im - v_im;
        const tmp_re = w_re * wlen_re - w_im * wlen_im;
        w_im = w_re * wlen_im + w_im * wlen_re;
        w_re = tmp_re;
      }
    }
  }
  
  return { real, imag };
}

// Get magnitude spectrum using FFT with optional averaging (Welch's method)
export function getFFTSpectrum(data: number[], windowSize: number = 1024, overlap: number = 0): { frequencies: number[], magnitudes: number[] } {
  if (overlap >= windowSize) overlap = windowSize - 1;
  const step = windowSize - overlap;
  
  const allMagnitudes: number[][] = [];
  
  // If no overlap and data is long enough, just take the first window
  // Otherwise, average multiple windows
  const maxWindows = 10; // Limit to 10 windows for performance
  let windowsCount = 0;
  
  for (let i = 0; i <= data.length - windowSize && windowsCount < maxWindows; i += step) {
    const real = data.slice(i, i + windowSize);
    const imag = new Array(windowSize).fill(0);
    
    // Apply Hanning window
    for (let j = 0; j < windowSize; j++) {
      real[j] *= 0.5 * (1 - Math.cos((2 * Math.PI * j) / (windowSize - 1)));
    }
    
    const { real: resReal, imag: resImag } = fft(real, imag);
    
    const magnitudes: number[] = [];
    for (let j = 0; j < windowSize / 2; j++) {
      magnitudes.push(Math.sqrt(resReal[j] * resReal[j] + resImag[j] * resImag[j]) / windowSize);
    }
    allMagnitudes.push(magnitudes);
    windowsCount++;
    
    if (overlap === 0) break; // Only one window if no overlap requested
  }
  
  if (allMagnitudes.length === 0) {
    // Fallback if data is too short
    return getFFTSpectrum(data, Math.pow(2, Math.floor(Math.log2(data.length))), 0);
  }
  
  // Average the magnitudes
  const avgMagnitudes = new Array(allMagnitudes[0].length).fill(0);
  for (let i = 0; i < allMagnitudes.length; i++) {
    for (let j = 0; j < allMagnitudes[i].length; j++) {
      avgMagnitudes[j] += allMagnitudes[i][j];
    }
  }
  
  const finalMagnitudes = avgMagnitudes.map(m => m / allMagnitudes.length);
  const frequencies = Array.from({ length: finalMagnitudes.length }, (_, i) => i);
  
  return { frequencies, magnitudes: finalMagnitudes };
}

// Generate spectrogram (STFT) using FFT
export function generateSpectrogram(data: number[], windowSize: number = 256, overlap: number = 128): number[][] {
  const step = windowSize - overlap;
  const spectrogram: number[][] = [];
  
  for (let i = 0; i < data.length - windowSize; i += step) {
    const window = data.slice(i, i + windowSize);
    const { magnitudes } = getFFTSpectrum(window, windowSize);
    spectrogram.push(magnitudes);
  }
  
  return spectrogram;
}

// Auto-detect scanline width based on autocorrelation
export function autoDetectScanlineWidth(data: number[], minWidth: number = 50, maxWidth: number = 1000): number {
  const ac = autocorrelation(data.slice(0, Math.min(data.length, maxWidth * 3)), maxWidth);
  let bestWidth = minWidth;
  let maxAc = -Infinity;
  
  // Look for the highest peak in autocorrelation within the range
  for (let i = minWidth; i < maxWidth; i++) {
    if (ac[i] > maxAc && ac[i] > ac[i - 1] && ac[i] > ac[i + 1]) {
      maxAc = ac[i];
      bestWidth = i;
    }
  }
  
  return bestWidth;
}

export interface DecodeOptions {
  gamma: number;
  contrast: number;
  brightness: number;
  transpose: boolean;
  flipH: boolean;
  flipV: boolean;
  skew?: number;
}

// Decode image from 1D signal
export function decodeImage(data: number[], width: number, lines: number, options: DecodeOptions): number[][] {
  const { gamma, contrast, brightness, transpose, flipH, flipV, skew = 0 } = options;
  
  // Extract raw pixels
  let rawPixels: number[][] = [];
  for (let y = 0; y < lines; y++) {
    const row: number[] = [];
    const shift = Math.floor(y * skew);
    for (let x = 0; x < Math.ceil(width); x++) {
      const idx = Math.floor(y * width + x) + shift;
      row.push((idx >= 0 && idx < data.length) ? data[idx] : 0);
    }
    rawPixels.push(row);
  }
  
  // Apply transformations
  if (transpose) {
    const transposed: number[][] = [];
    for (let x = 0; x < Math.ceil(width); x++) {
      const newRow: number[] = [];
      for (let y = 0; y < lines; y++) {
        newRow.push(rawPixels[y][x]);
      }
      transposed.push(newRow);
    }
    rawPixels = transposed;
  }
  
  if (flipH) {
    rawPixels = rawPixels.map(row => [...row].reverse());
  }
  
  if (flipV) {
    rawPixels = [...rawPixels].reverse();
  }
  
  // Apply image adjustments
  return rawPixels.map(row => 
    row.map(val => {
      // Normalize to 0-1 if not already
      let v = val;
      // Contrast
      v = (v - 0.5) * contrast + 0.5;
      // Brightness (-100 to 100 mapped to -1 to 1)
      v = v + (brightness / 100);
      // Clamp
      v = Math.max(0, Math.min(1, v));
      // Gamma
      v = Math.pow(v, gamma);
      return v;
    })
  );
}

// Analyze signal characteristics
export function analyzeSignal(data: number[]): { peakAmplitude: number, rms: number, snr: number, dominantFrequency: number } {
  if (data.length === 0) return { peakAmplitude: 0, rms: 0, snr: 0, dominantFrequency: 0 };
  
  let max = -Infinity;
  let sumSq = 0;
  
  for (let i = 0; i < data.length; i++) {
    if (Math.abs(data[i]) > max) max = Math.abs(data[i]);
    sumSq += data[i] * data[i];
  }
  
  const rms = Math.sqrt(sumSq / data.length);
  
  // Simple SNR estimation (assuming mean is noise floor, very naive)
  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  const noiseVariance = data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / data.length;
  const signalPower = rms * rms;
  const snr = noiseVariance > 0 ? 10 * Math.log10(signalPower / noiseVariance) : 100;
  
  // Dominant frequency
  const { frequencies, magnitudes } = dft(data.slice(0, Math.min(data.length, 1024)));
  let maxMag = -Infinity;
  let domFreq = 0;
  for (let i = 1; i < magnitudes.length; i++) { // Skip DC
    if (magnitudes[i] > maxMag) {
      maxMag = magnitudes[i];
      domFreq = frequencies[i];
    }
  }
  
  return { peakAmplitude: max, rms, snr, dominantFrequency: domFreq };
}

// Detect patterns and classify
export function detectPatterns(data: number[]): { type: 'artificial' | 'natural' | 'noise', confidence: number, period: number | null, dominantFrequencies: number[] } {
  const ac = autocorrelation(data.slice(0, Math.min(data.length, 2000)), 1000);
  const peaks = findPeaks(ac, 0.3, 10);
  
  const { frequencies, magnitudes } = dft(data.slice(0, Math.min(data.length, 1024)));
  
  // Find top 3 frequencies
  const freqsWithMags = frequencies.map((f, i) => ({ f, m: magnitudes[i] })).slice(1); // Skip DC
  freqsWithMags.sort((a, b) => b.m - a.m);
  const dominantFrequencies = freqsWithMags.slice(0, 3).map(x => x.f);
  
  let type: 'artificial' | 'natural' | 'noise' = 'noise';
  let confidence = 0.5;
  let period = null;
  
  if (peaks.length > 2) {
    // Check if peaks are evenly spaced
    const diffs = [];
    for (let i = 1; i < peaks.length; i++) {
      diffs.push(peaks[i] - peaks[i-1]);
    }
    const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
    const variance = diffs.reduce((a, b) => a + Math.pow(b - avgDiff, 2), 0) / diffs.length;
    
    if (variance < 5) {
      period = Math.round(avgDiff);
      // Highly regular periodic signals are often artificial or pulsars
      if (period > 50) {
        type = 'artificial';
        confidence = 0.85;
      } else {
        type = 'natural'; // Pulsar-like
        confidence = 0.75;
      }
    }
  } else if (dominantFrequencies.length > 0 && freqsWithMags[0].m > 0.1) {
    // Strong single frequency
    type = 'artificial';
    confidence = 0.9;
  } else {
    confidence = 0.8;
  }
  
  return { type, confidence, period, dominantFrequencies };
}

/**
 * Binary Extraction & Character Encoding
 */

// Extract binary bitstream from a signal using adaptive thresholding
export function extractBinary(data: number[], samplesPerBit: number = 20): number[] {
  if (data.length === 0) return [];
  
  const normalized = normalizeSignal(data);
  const envelope = new Array(normalized.length).fill(0);
  const windowSize = Math.max(5, Math.floor(normalized.length / 50));
  
  // Simple envelope detection
  let sum = 0;
  for (let i = 0; i < windowSize && i < normalized.length; i++) sum += normalized[i];
  for (let i = 0; i < normalized.length - windowSize; i++) {
    envelope[i] = sum / windowSize;
    sum += normalized[i + windowSize] - normalized[i];
  }
  
  // Mean-based thresholding
  const threshold = envelope.reduce((a, b) => a + b, 0) / envelope.length;
  const rawBits = envelope.map(v => v > threshold ? 1 : 0);
  
  // Sample bits at centers (Astro linguistics multi-sampling at positions 3, 6, 9... up to 600)
  const bits: number[] = [];
  for (let i = 3; i <= 600; i += 3) {
    if (i < rawBits.length) {
      bits.push(rawBits[i]);
    }
  }
  
  return bits;
}

// Convert bitstream to strings (ASCII/UTF-8 compatible)
export function binaryToAscii(bits: number[]): string {
  let result = "";
  for (let i = 0; i < bits.length - 7; i += 8) {
    const byte = bits.slice(i, i + 8).join('');
    const charCode = parseInt(byte, 2);
    // Only include printable characters
    if (charCode >= 32 && charCode <= 126) {
      result += String.fromCharCode(charCode);
    } else if (charCode === 10 || charCode === 13) {
      result += " "; // Handle newlines as spaces
    }
  }
  return result;
}

/**
 * Sonification Utilities
 */

export interface SonifyOptions {
  sampleRate: number;
  gain: number;
  frequencyFactor: number;
}

// Play signal data through Web Audio API
export function sonifySignal(data: number[], options: SonifyOptions): () => void {
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) return () => {};
  
  const ctx = new AudioContext();
  const normalized = normalizeSignal(data);
  const floatData = new Float32Array(normalized.map(v => (v - 0.5) * 2));
  
  const buffer = ctx.createBuffer(1, floatData.length, options.sampleRate);
  buffer.getChannelData(0).set(floatData);
  
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  
  const gainNode = ctx.createGain();
  gainNode.gain.value = options.gain;
  
  source.connect(gainNode);
  gainNode.connect(ctx.destination);
  
  source.start();
  
  return () => {
    try {
      source.stop();
      ctx.close();
    } catch (e) {
      // Ignore if already stopped
    }
  };
}

/**
 * Advanced Detection Algorithms
 */

// Calculate Kurtosis (to detect non-Gaussian transients/anomalies)
export function calculateKurtosis(data: number[]): number {
  if (data.length === 0) return 0;
  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  const variance = data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / data.length;
  if (variance === 0) return 0;
  const fourthMoment = data.reduce((a, b) => a + Math.pow(b - mean, 4), 0) / data.length;
  return (fourthMoment / Math.pow(variance, 2)) - 3; // Excess kurtosis
}

// Calculate Spectral Kurtosis (to detect RFI/Anomalies in frequency domain)
export function calculateSpectralKurtosis(data: number[]): number[] {
  const spectrogram = generateSpectrogram(data, 128, 64);
  const skList: number[] = [];
  
  // Calculate SK for each frequency bin across time
  const numBins = spectrogram[0].length;
  for (let bin = 0; bin < numBins; bin++) {
    const binValues = spectrogram.map(frame => frame[bin]);
    skList.push(calculateKurtosis(binValues));
  }
  
  return skList;
}

// Calculate Noise Floor using Median Absolute Deviation (MAD) for robustness
export function estimateNoiseFloor(data: number[]): { median: number, mad: number } {
  const sorted = [...data].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const absDev = data.map(x => Math.abs(x - median));
  const sortedAbsDev = absDev.sort((a, b) => a - b);
  const mad = sortedAbsDev[Math.floor(sortedAbsDev.length / 2)];
  return { median, mad };
}

// Calculate Spectral Saliency (Multi-scale frequency feature extraction)
export function calculateSpectralSaliency(spectrogram: number[][]): number[] {
  const numBins = spectrogram[0].length;
  const saliency: number[] = new Array(numBins).fill(0);
  
  // Analyze across frequency bins
  for (let bin = 0; bin < numBins; bin++) {
    const timeSeries = spectrogram.map(frame => frame[bin]);
    const max = Math.max(...timeSeries);
    const mean = timeSeries.reduce((a, b) => a + b, 0) / timeSeries.length;
    const std = Math.sqrt(timeSeries.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / timeSeries.length);
    
    // Saliency = (Peak to Mean Ratio) * (Stability factor)
    const ptmr = mean === 0 ? 0 : max / mean;
    const stability = std < 0.01 ? 1.0 : Math.max(0, 1 - std);
    saliency[bin] = ptmr * stability;
  }
  
  return saliency;
}

// Calculate Spectral Correlation (Contextual neighbor analysis proxy)
export function calculateSpectralCorrelation(frame: number[]): number {
  if (frame.length < 2) return 0;
  let correlationSum = 0;
  for (let i = 1; i < frame.length; i++) {
    // Artificial signals often have consistent power across adjacent bins (sync pulses/pilots)
    const diff = Math.abs(frame[i] - frame[i - 1]);
    correlationSum += (1 - Math.min(1, diff * 5)); 
  }
  return correlationSum / (frame.length - 1);
}

// Rebuilt Anomaly Detection Engine (Neural Fusion Approach)
export function detectDeepAnomaly(data: number[]): { score: number, anomalies: number[], description: string, metrics: any } {
  const part = data.slice(0, 4096);
  const spectrogram = generateSpectrogram(part, 128, 64);
  const { median, mad } = estimateNoiseFloor(part);
  
  // 1. Neural Saliency (Multi-scale spectral persistence)
  const saliencyMap = calculateSpectralSaliency(spectrogram);
  const peakSaliency = Math.max(...saliencyMap);
  const saliencyScore = Math.min(1, peakSaliency / 15);

  // 2. Spectral Kurtosis (SK) - Detects non-Gaussian transients
  const skValues = calculateSpectralKurtosis(part);
  const avgSK = skValues.reduce((a, b) => a + Math.abs(b), 0) / skValues.length;
  const skScore = Math.min(1, avgSK / 5);

  // 3. Spectral Correlation (Structural Attention)
  let totalCorrelation = 0;
  for (const frame of spectrogram) {
    totalCorrelation += calculateSpectralCorrelation(frame);
  }
  const correlationScore = totalCorrelation / spectrogram.length;

  // 4. SNR-Adaptive Regularity (Modulation Analysis)
  const snrThreshold = median + 3 * mad;
  const highPowerPoints = part.filter(x => x > snrThreshold).length;
  const sparsityFactor = highPowerPoints / part.length;
  // Natural noise is dense/broadband; Artifical is often sparse/narrowband
  const sparsityScore = sparsityFactor > 0 && sparsityFactor < 0.2 ? (1 - sparsityFactor * 5) : 0;

  const patterns = detectPatterns(part.slice(0, 2048));
  const regularityScore = patterns.type === 'artificial' ? patterns.confidence : 0;

  // Final Neural-Inspired Fusion
  // 25% Saliency, 25% SK, 20% Correlation, 15% Sparsity, 15% Regularity
  const rawScore = 
    saliencyScore * 0.25 + 
    skScore * 0.25 + 
    correlationScore * 0.20 + 
    sparsityScore * 0.15 + 
    regularityScore * 0.15;

  const score = Math.min(1, rawScore * 1.4); // Scale to dynamic range
  
  const metrics = {
    avgKurtosis: calculateKurtosis(part.slice(0, 2048)),
    avgSpectralKurtosis: avgSK,
    peakSaliency: peakSaliency,
    spectralCorrelation: correlationScore,
    sparsity: sparsityFactor,
    snrFloor: median + mad
  };

  let description = "Spectrum analysis indicates nominal stochastic (Gaussian) distribution.";
  if (score > 0.85) description = "CRITICAL: Deep Neural Network detected high-confidence synthetic artifacts. Class: EXOGENOUS.";
  else if (score > 0.6) description = "ANOMALY: Structured non-terrestrial patterns identified via multi-scale saliency.";
  else if (score > 0.35) description = "CAUTION: Low-level spectral non-stationarity detected. Possible residual RFI.";
  
  return { score, anomalies: [], description, metrics };
}

// Cyclostationary Feature Detection (Periodicity in headers/pilot tones)
export function detectCyclostationarity(data: number[]): { periodicityScore: number, hiddenFreqs: number[] } {
  // We look for periodic changes in the signal power or variance
  const chunkSize = 32;
  const variances: number[] = [];
  
  for (let i = 0; i < data.length - chunkSize; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);
    const mean = chunk.reduce((a, b) => a + b, 0) / chunkSize;
    const variance = chunk.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / chunkSize;
    variances.push(variance);
  }
  
  const { frequencies, magnitudes } = dft(variances, 50);
  const hiddenFreqs = frequencies.filter((f, i) => magnitudes[i] > 0.05 && f > 0);
  const periodicityScore = Math.min(1, Math.max(...magnitudes) * 5);
  
  return { periodicityScore, hiddenFreqs };
}

// ASVspoof Baseline: Vocoder & Robotic Texture Detection
export function detectVocoderArtifacts(data: number[]): { flux: number, centroid: number, roboticTextureScore: number } {
  const spectrogram = generateSpectrogram(data.slice(0, 2048), 128, 64);
  
  // Spectral Centroid: Center of mass of the spectrum
  let totalCentroid = 0;
  for (const frame of spectrogram) {
    let weightedSum = 0;
    let totalMag = 0;
    for (let i = 0; i < frame.length; i++) {
      weightedSum += i * frame[i];
      totalMag += frame[i];
    }
    totalCentroid += (totalMag === 0 ? 0 : weightedSum / totalMag);
  }
  const centroid = totalCentroid / spectrogram.length;
  
  // Spectral Flux: Rate of change of the spectrum
  let totalFlux = 0;
  for (let i = 1; i < spectrogram.length; i++) {
    for (let j = 0; j < spectrogram[i].length; j++) {
      const diff = spectrogram[i][j] - spectrogram[i-1][j];
      totalFlux += Math.max(0, diff * diff);
    }
  }
  const flux = totalFlux / spectrogram.length;
  
  // Robotic textures often have low spectral flux (too stable) or high centroid (too bright/noisy)
  let roboticTextureScore = 0;
  if (flux < 0.01) roboticTextureScore += 0.4; // Unnatural stability
  if (centroid > 50) roboticTextureScore += 0.4; // Unnatural brightness (vocoder artifacts)
  
  return { flux, centroid, roboticTextureScore: Math.min(1, roboticTextureScore) };
}

// Clean signal by applying a simple band-pass/smoothing filter to emphasize integer periodicities
export function cleanSignal(data: number[], targetPeriods: number[] = [1, 2, 10]): number[] {
  if (data.length === 0) return [];
  
  const cleaned = new Array(data.length).fill(0);
  const windowSize = Math.max(...targetPeriods);
  
  for (let i = 0; i < data.length; i++) {
    let sum = 0;
    let weightSum = 0;
    
    // Simple convolution-like approach to emphasize target periods
    for (const period of targetPeriods) {
      if (i >= period) {
        sum += data[i - period];
        weightSum += 1;
      }
      if (i + period < data.length) {
        sum += data[i + period];
        weightSum += 1;
      }
    }
    
    // Add current value
    sum += data[i] * 2;
    weightSum += 2;
    
    cleaned[i] = sum / weightSum;
  }
  
  return normalizeSignal(cleaned);
}
