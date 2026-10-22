import { describe, it, expect } from 'vitest';
import {
  calculateDistortion,
  compressDPCM,
  compressLinearPrediction,
  compressDCT,
  forwardDCT,
  inverseDCT,
} from './lossy.js';

const SIGNAL = [10, 12, 13, 11, 17, 20, 18, 22, 21, 26, 24, 25];
const BLOCK = [
  [52, 55, 61, 66, 70, 61, 64, 73],
  [63, 59, 55, 90, 109, 85, 69, 72],
  [62, 59, 68, 113, 144, 104, 66, 73],
  [63, 58, 71, 122, 154, 106, 70, 69],
  [67, 61, 68, 104, 126, 88, 68, 70],
  [79, 65, 60, 70, 77, 68, 58, 75],
  [85, 71, 64, 59, 55, 61, 65, 83],
  [87, 79, 69, 68, 65, 76, 78, 94],
];

describe('lossy compression engines', () => {
  it('encodes and reconstructs a DPCM signal from quantized residuals', () => {
    const result = compressDPCM(SIGNAL, 2);
    expect(result.reconstructed).toHaveLength(SIGNAL.length);
    expect(result.quantizedResiduals).toHaveLength(SIGNAL.length);
    expect(result.steps.at(-1).type).toBe('complete');
    expect(result.steps.some((step) => step.msgKey.endsWith('.dpcmSample'))).toBe(true);
    expect(result.metrics.mse).toBeGreaterThanOrEqual(0);
  });

  it('uses the previous reconstructed sample in DPCM feedback', () => {
    const result = compressDPCM([10, 14, 19], 4);
    expect(result.reconstructed).toEqual([12, 16, 20]);
    expect(result.residuals).toEqual([10, 2, 3]);
  });

  it('can reconstruct an LPC signal closely with a fine quantization step', () => {
    const result = compressLinearPrediction(SIGNAL, { stepSize: 0.001, coefficients: [0.75, -0.25] });
    expect(result.reconstructed).toHaveLength(SIGNAL.length);
    result.reconstructed.forEach((value, index) => {
      expect(value).toBeCloseTo(SIGNAL[index], 2);
    });
    expect(result.coefficients).toEqual([0.75, -0.25]);
  });

  it('validates signal samples and quantization settings', () => {
    expect(() => compressDPCM([], 1)).toThrow(/samples/i);
    expect(() => compressDPCM([1, Number.NaN], 1)).toThrow(/finite numbers/i);
    expect(() => compressDPCM([1, 2], 0)).toThrow(/quantization step/i);
    expect(() => compressLinearPrediction([1, 2], { coefficients: [3] })).toThrow(/coefficients/i);
  });

  it('round-trips an 8×8 DCT block before quantization within rounding tolerance', () => {
    const rebuilt = inverseDCT(forwardDCT(BLOCK));
    BLOCK.forEach((row, r) => row.forEach((value, c) => {
      expect(Math.abs(rebuilt[r][c] - value)).toBeLessThanOrEqual(1);
    }));
  });

  it('quantizes DCT coefficients and reports distortion and retained coefficients', () => {
    const fine = compressDCT(BLOCK, 2);
    const coarse = compressDCT(BLOCK, 24);
    expect(fine.reconstructed).toHaveLength(8);
    expect(fine.reconstructed.every((row) => row.length === 8)).toBe(true);
    expect(coarse.retainedCoefficients).toBeLessThanOrEqual(fine.retainedCoefficients);
    expect(coarse.metrics.mse).toBeGreaterThanOrEqual(fine.metrics.mse);
    expect(coarse.steps.at(-1).msgKey.endsWith('.complete')).toBe(true);
  });

  it('calculates zero distortion and infinite PSNR for an exact reconstruction', () => {
    expect(calculateDistortion([1, 2], [1, 2])).toEqual({ mse: 0, psnr: Infinity });
  });

  it('rejects malformed DCT blocks', () => {
    expect(() => compressDCT([[0]], 8)).toThrow(/8×8/i);
    expect(() => compressDCT(BLOCK, -1)).toThrow(/quantization step/i);
  });
});
