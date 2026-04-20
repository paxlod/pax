import { describe, it, expect } from 'vitest';
import {
  normalizeSignal,
  findPeaks,
  autocorrelation,
  dft,
  generateSpectrogram,
  autoDetectScanlineWidth,
  decodeImage,
  analyzeSignal,
  detectPatterns
} from '../signal-processing';
import { getSignalLibrary, getSignalById, generateGoldenRecordSignal, generatePulsarSignal, generateWowSignal, generateTestChirp } from '../signal-data';

describe('Signal Processing', () => {
  // normalizeSignal (3 tests)
  it('normalizeSignal normalizes to [0, 1]', () => {
    const data = [10, 20, 30, 40, 50];
    const normalized = normalizeSignal(data);
    expect(normalized).toEqual([0, 0.25, 0.5, 0.75, 1]);
  });

  it('normalizeSignal handles constant arrays', () => {
    const data = [5, 5, 5];
    const normalized = normalizeSignal(data);
    expect(normalized).toEqual([0.5, 0.5, 0.5]);
  });

  it('normalizeSignal handles empty arrays', () => {
    expect(normalizeSignal([])).toEqual([]);
  });

  // findPeaks (3 tests)
  it('findPeaks finds local maxima above threshold', () => {
    const data = [0.1, 0.9, 0.2, 0.1, 0.85, 0.1];
    const peaks = findPeaks(data, 0.8, 2);
    expect(peaks).toEqual([1, 4]);
  });

  it('findPeaks respects minDistance', () => {
    const data = [0.1, 0.9, 0.85, 0.1];
    const peaks = findPeaks(data, 0.8, 2);
    expect(peaks).toEqual([1]); // 0.85 is too close to 0.9
  });

  it('findPeaks returns empty array if no peaks', () => {
    const data = [0.1, 0.2, 0.3, 0.4];
    const peaks = findPeaks(data, 0.8, 2);
    expect(peaks).toEqual([]);
  });

  // autocorrelation (3 tests)
  it('autocorrelation computes correct lags', () => {
    const data = [1, 0, 1, 0, 1, 0];
    const ac = autocorrelation(data, 3);
    expect(ac[0]).toBeCloseTo(1);
    expect(ac[1]).toBeLessThan(0);
    expect(ac[2]).toBeGreaterThan(0.5); // Due to edge effects, it's ~0.66
  });

  it('autocorrelation handles zero variance', () => {
    const data = [1, 1, 1, 1];
    const ac = autocorrelation(data, 2);
    expect(ac).toEqual([0, 0]);
  });

  it('autocorrelation returns correct length', () => {
    const data = [1, 2, 3, 4, 5];
    const ac = autocorrelation(data, 4);
    expect(ac.length).toBe(4);
  });

  // dft (3 tests)
  it('dft computes frequencies and magnitudes', () => {
    const data = Array.from({ length: 16 }, (_, i) => Math.sin(2 * Math.PI * 2 * i / 16));
    const { frequencies, magnitudes } = dft(data, 8);
    expect(frequencies.length).toBe(8);
    expect(magnitudes.length).toBe(8);
    expect(magnitudes[2]).toBeGreaterThan(magnitudes[1]);
    expect(magnitudes[2]).toBeGreaterThan(magnitudes[3]);
  });

  it('dft respects maxFreqs limit', () => {
    const data = Array.from({ length: 32 }, () => Math.random());
    const { frequencies } = dft(data, 5);
    expect(frequencies.length).toBe(5);
  });

  it('dft handles empty array', () => {
    const { frequencies, magnitudes } = dft([]);
    expect(frequencies).toEqual([]);
    expect(magnitudes).toEqual([]);
  });

  // generateSpectrogram (2 tests)
  it('generateSpectrogram creates 2D array', () => {
    const data = Array.from({ length: 512 }, () => Math.random());
    const spec = generateSpectrogram(data, 128, 64);
    expect(spec.length).toBeGreaterThan(0);
    expect(spec[0].length).toBe(64);
  });

  it('generateSpectrogram handles short signals', () => {
    const data = [1, 2, 3];
    const spec = generateSpectrogram(data, 128, 64);
    expect(spec).toEqual([]);
  });

  // autoDetectScanlineWidth (2 tests)
  it('autoDetectScanlineWidth finds correct width', () => {
    const data = Array.from({ length: 1000 }, (_, i) => Math.sin(2 * Math.PI * i / 100));
    const width = autoDetectScanlineWidth(data, 50, 200);
    expect(width).toBe(100);
  });

  it('autoDetectScanlineWidth respects bounds', () => {
    const data = Array.from({ length: 1000 }, () => Math.random());
    const width = autoDetectScanlineWidth(data, 50, 200);
    expect(width).toBeGreaterThanOrEqual(50);
    expect(width).toBeLessThanOrEqual(200);
  });

  // decodeImage (3 tests)
  it('decodeImage applies transformations correctly', () => {
    const data = [0.1, 0.2, 0.3, 0.4];
    const options = { gamma: 1, contrast: 1, brightness: 0, transpose: false, flipH: false, flipV: false };
    const img = decodeImage(data, 2, 2, options);
    expect(img.length).toBe(2);
    expect(img[0].length).toBe(2);
    expect(img[0][0]).toBeCloseTo(0.1);
    expect(img[1][1]).toBeCloseTo(0.4);
  });

  it('decodeImage handles transpose', () => {
    const data = [0.1, 0.2, 0.3, 0.4];
    const options = { gamma: 1, contrast: 1, brightness: 0, transpose: true, flipH: false, flipV: false };
    const img = decodeImage(data, 2, 2, options);
    expect(img[0][1]).toBeCloseTo(0.3);
    expect(img[1][0]).toBeCloseTo(0.2);
  });

  it('decodeImage handles flips', () => {
    const data = [0.1, 0.2, 0.3, 0.4];
    const options = { gamma: 1, contrast: 1, brightness: 0, transpose: false, flipH: true, flipV: true };
    const img = decodeImage(data, 2, 2, options);
    expect(img[0][0]).toBeCloseTo(0.4);
    expect(img[1][1]).toBeCloseTo(0.1);
  });

  // analyzeSignal (2 tests)
  it('analyzeSignal computes stats', () => {
    const data = [0, 1, 0, -1];
    const stats = analyzeSignal(data);
    expect(stats.peakAmplitude).toBe(1);
    expect(stats.rms).toBeCloseTo(Math.sqrt(0.5));
  });

  it('analyzeSignal handles empty array', () => {
    const stats = analyzeSignal([]);
    expect(stats.peakAmplitude).toBe(0);
    expect(stats.rms).toBe(0);
  });

  // detectPatterns (2 tests)
  it('detectPatterns classifies periodic signals', () => {
    const data = Array.from({ length: 1000 }, (_, i) => Math.sin(2 * Math.PI * i / 60));
    const result = detectPatterns(data);
    expect(result.type).toBe('artificial');
    expect(result.period).toBe(60);
  });

  it('detectPatterns classifies noise', () => {
    const data = Array.from({ length: 1000 }, () => Math.random());
    const result = detectPatterns(data);
    expect(result.type).toBe('noise');
  });
});

describe('Signal Data Library', () => {
  it('getSignalLibrary returns signals', () => {
    const lib = getSignalLibrary();
    expect(lib.length).toBeGreaterThan(0);
  });

  it('getSignalById finds correct signal', () => {
    const signal = getSignalById('gr-01');
    expect(signal).toBeDefined();
    expect(signal?.metadata.id).toBe('gr-01');
  });

  it('generateGoldenRecordSignal creates valid signal', () => {
    const signal = generateGoldenRecordSignal();
    expect(signal.data.length).toBe(10000);
    expect(signal.metadata.category).toBe('Golden Record');
  });

  it('generatePulsarSignal creates valid signal', () => {
    const signal = generatePulsarSignal();
    expect(signal.data.length).toBeGreaterThan(0);
    expect(signal.metadata.category).toBe('Pulsar');
  });

  it('generateWowSignal creates valid signal', () => {
    const signal = generateWowSignal();
    expect(signal.data.length).toBeGreaterThan(0);
    expect(signal.metadata.category).toBe('SETI');
  });

  it('generateTestChirp creates valid signal', () => {
    const signal = generateTestChirp();
    expect(signal.data.length).toBeGreaterThan(0);
    expect(signal.metadata.category).toBe('Test');
  });
});
