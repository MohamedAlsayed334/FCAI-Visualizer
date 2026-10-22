const MAX_SIGNAL_LENGTH = 128;
const MAX_SAMPLE_MAGNITUDE = 1024;
const DCT_SIZE = 8;

function makeStep(type, msgKey, state = {}) {
  return { type, msgKey: `catalog:compression.lossy.steps.${msgKey}`, ...state };
}

function validateStepSize(stepSize) {
  if (!Number.isFinite(stepSize) || stepSize <= 0 || stepSize > 1024) {
    throw new RangeError('Quantization step must be greater than 0 and at most 1024.');
  }
}

function validateSignal(samples) {
  if (!Array.isArray(samples) || samples.length < 1 || samples.length > MAX_SIGNAL_LENGTH) {
    throw new TypeError(`Enter between 1 and ${MAX_SIGNAL_LENGTH} numeric samples.`);
  }
  if (!samples.every((sample) => Number.isFinite(sample) && Math.abs(sample) <= MAX_SAMPLE_MAGNITUDE)) {
    throw new TypeError(`Samples must be finite numbers between -${MAX_SAMPLE_MAGNITUDE} and ${MAX_SAMPLE_MAGNITUDE}.`);
  }
  return samples.slice();
}

function validateCoefficients(coefficients) {
  if (!Array.isArray(coefficients) || coefficients.length < 1 || coefficients.length > 4
    || !coefficients.every((value) => Number.isFinite(value) && Math.abs(value) <= 2)) {
    throw new TypeError('Use 1–4 finite predictor coefficients between -2 and 2.');
  }
  return coefficients.slice();
}

function quantize(value, stepSize) {
  const quantizedMagnitude = Math.floor(Math.abs(value) / stepSize + 0.5) * stepSize;
  return Math.sign(value) * quantizedMagnitude;
}

export function calculateDistortion(original, reconstructed, peakValue) {
  if (!Array.isArray(original) || !Array.isArray(reconstructed) || original.length !== reconstructed.length || original.length === 0) {
    throw new TypeError('Distortion metrics require equally sized, non-empty arrays.');
  }
  const mse = original.reduce((sum, value, index) => sum + ((value - reconstructed[index]) ** 2), 0) / original.length;
  const peak = peakValue === undefined
    ? Math.max(1, ...original.map((value) => Math.abs(value)))
    : peakValue;
  if (!Number.isFinite(peak) || peak <= 0) throw new RangeError('Peak value must be a positive finite number.');
  return { mse, psnr: mse === 0 ? Infinity : 10 * Math.log10((peak * peak) / mse) };
}

export function compressDPCM(inputSamples, stepSize = 1) {
  const samples = validateSignal(inputSamples);
  validateStepSize(stepSize);
  const reconstructed = [];
  const residuals = [];
  const quantizedResiduals = [];
  const steps = [makeStep('start', 'dpcmStart', { count: samples.length, stepSize })];

  samples.forEach((sample, index) => {
    // The decoder uses the previously reconstructed sample as its predictor.
    const predicted = index === 0 ? 0 : reconstructed[index - 1];
    const residual = sample - predicted;
    const quantizedResidual = quantize(residual, stepSize);
    const rebuilt = predicted + quantizedResidual;
    residuals.push(residual);
    quantizedResiduals.push(quantizedResidual);
    reconstructed.push(rebuilt);
    steps.push(makeStep('dpcmSample', 'dpcmSample', {
      index, sampleNumber: index + 1, sample, predicted, residual, quantizedResidual, reconstructed: rebuilt,
      original: samples.slice(), residuals: residuals.slice(),
      quantizedResiduals: quantizedResiduals.slice(), reconstruction: reconstructed.slice(),
      stepSize,
    }));
  });

  const metrics = calculateDistortion(samples, reconstructed);
  steps.push(makeStep('complete', 'complete', {
    count: samples.length, mse: metrics.mse, psnr: metrics.psnr,
    original: samples.slice(), reconstruction: reconstructed.slice(),
  }));
  return { samples, residuals, quantizedResiduals, reconstructed, metrics, stepSize, steps };
}

export function compressLinearPrediction(inputSamples, {
  stepSize = 1,
  coefficients = [0.75, -0.25],
} = {}) {
  const samples = validateSignal(inputSamples);
  validateStepSize(stepSize);
  const predictor = validateCoefficients(coefficients);
  const residuals = [];
  const quantizedResiduals = [];
  const reconstructed = [];
  const steps = [makeStep('start', 'linearStart', {
    count: samples.length, stepSize, coefficients: predictor.slice(),
  })];

  samples.forEach((sample, index) => {
    const predicted = predictor.reduce((sum, coefficient, lag) => (
      sum + coefficient * (index > lag ? reconstructed[index - lag - 1] : 0)
    ), 0);
    const residual = sample - predicted;
    const quantizedResidual = quantize(residual, stepSize);
    const rebuilt = predicted + quantizedResidual;
    residuals.push(residual);
    quantizedResiduals.push(quantizedResidual);
    reconstructed.push(rebuilt);
    steps.push(makeStep('linearSample', 'linearSample', {
      index, sampleNumber: index + 1, sample, predicted, residual, quantizedResidual, reconstructed: rebuilt,
      coefficients: predictor.slice(), original: samples.slice(),
      residuals: residuals.slice(), quantizedResiduals: quantizedResiduals.slice(),
      reconstruction: reconstructed.slice(), stepSize,
    }));
  });

  const metrics = calculateDistortion(samples, reconstructed);
  steps.push(makeStep('complete', 'complete', {
    count: samples.length, mse: metrics.mse, psnr: metrics.psnr,
    original: samples.slice(), reconstruction: reconstructed.slice(),
  }));
  return { samples, coefficients: predictor, residuals, quantizedResiduals, reconstructed, metrics, stepSize, steps };
}

function validateBlock(block) {
  if (!Array.isArray(block) || block.length !== DCT_SIZE
    || block.some((row) => !Array.isArray(row) || row.length !== DCT_SIZE
      || !row.every((value) => Number.isFinite(value) && value >= 0 && value <= 255))) {
    throw new TypeError('Enter an 8×8 block containing pixel values from 0 to 255.');
  }
  return block.map((row) => row.slice());
}

function alpha(index) {
  return index === 0 ? Math.SQRT1_2 : 1;
}

export function forwardDCT(block) {
  const source = validateBlock(block);
  const coefficients = Array.from({ length: DCT_SIZE }, () => Array(DCT_SIZE).fill(0));
  for (let u = 0; u < DCT_SIZE; u += 1) {
    for (let v = 0; v < DCT_SIZE; v += 1) {
      let sum = 0;
      for (let x = 0; x < DCT_SIZE; x += 1) {
        for (let y = 0; y < DCT_SIZE; y += 1) {
          sum += (source[x][y] - 128)
            * Math.cos(((2 * x + 1) * u * Math.PI) / 16)
            * Math.cos(((2 * y + 1) * v * Math.PI) / 16);
        }
      }
      coefficients[u][v] = 0.25 * alpha(u) * alpha(v) * sum;
    }
  }
  return coefficients;
}

export function inverseDCT(coefficients) {
  if (!Array.isArray(coefficients) || coefficients.length !== DCT_SIZE
    || coefficients.some((row) => !Array.isArray(row) || row.length !== DCT_SIZE
      || !row.every(Number.isFinite))) {
    throw new TypeError('DCT coefficients must be a finite 8×8 matrix.');
  }
  return Array.from({ length: DCT_SIZE }, (_, x) => Array.from({ length: DCT_SIZE }, (_, y) => {
    let sum = 0;
    for (let u = 0; u < DCT_SIZE; u += 1) {
      for (let v = 0; v < DCT_SIZE; v += 1) {
        sum += alpha(u) * alpha(v) * coefficients[u][v]
          * Math.cos(((2 * x + 1) * u * Math.PI) / 16)
          * Math.cos(((2 * y + 1) * v * Math.PI) / 16);
      }
    }
    return Math.max(0, Math.min(255, Math.round(0.25 * sum + 128)));
  }));
}

export function compressDCT(inputBlock, stepSize = 8) {
  const block = validateBlock(inputBlock);
  validateStepSize(stepSize);
  const coefficients = forwardDCT(block);
  const steps = [makeStep('start', 'dctStart', { stepSize, original: block })];
  steps.push(makeStep('dctTransform', 'dctTransform', { coefficients, original: block, stepSize }));

  const quantizedCoefficients = coefficients.map((row, u) => row.map((value, v) => {
    const quantized = quantize(value, stepSize);
    steps.push(makeStep('dctQuantize', 'dctQuantize', {
      u, v, coefficient: value, quantized, stepSize,
      coefficients, quantizedCoefficients: null, original: block,
    }));
    return quantized;
  }));
  // The quantization steps share one immutable final matrix for the UI history.
  for (const step of steps) {
    if (step.type === 'dctQuantize') step.quantizedCoefficients = quantizedCoefficients;
  }
  const reconstructed = inverseDCT(quantizedCoefficients);
  const originalFlat = block.flat();
  const reconstructedFlat = reconstructed.flat();
  const metrics = calculateDistortion(originalFlat, reconstructedFlat, 255);
  const retainedCoefficients = quantizedCoefficients.flat().filter((value) => value !== 0).length;
  steps.push(makeStep('dctReconstruct', 'dctReconstruct', {
    original: block, coefficients, quantizedCoefficients, reconstruction: reconstructed,
    stepSize, retainedCoefficients,
  }));
  steps.push(makeStep('complete', 'complete', {
    original: block, coefficients, quantizedCoefficients, reconstruction: reconstructed,
    count: DCT_SIZE * DCT_SIZE, stepSize, retainedCoefficients, mse: metrics.mse, psnr: metrics.psnr,
  }));
  return { original: block, coefficients, quantizedCoefficients, reconstructed, metrics, retainedCoefficients, stepSize, steps };
}

export const LOSSY_LIMITS = Object.freeze({
  maxSignalLength: MAX_SIGNAL_LENGTH,
  maxSampleMagnitude: MAX_SAMPLE_MAGNITUDE,
  dctSize: DCT_SIZE,
});
