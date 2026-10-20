const MAX_INPUT_LENGTH = 256;

function step(msgKey, state = {}) {
  return { type: 'arithmetic', msgKey: `catalog:compression.steps.${msgKey}`, ...state };
}

function toSymbols(text) {
  if (typeof text !== 'string') throw new TypeError('Input text must be a string.');
  const symbols = Array.from(text);
  if (symbols.length > MAX_INPUT_LENGTH) {
    throw new RangeError(`Input text must contain at most ${MAX_INPUT_LENGTH} characters.`);
  }
  return symbols;
}

function fraction(numerator, denominator) {
  const decimalScale = 10n ** 15n;
  return {
    numerator: numerator.toString(),
    denominator: denominator.toString(),
    decimal: Number((numerator * decimalScale) / denominator) / Number(decimalScale),
  };
}

function intervalState(low, high, denominator) {
  const lowFraction = fraction(low, denominator);
  const highFraction = fraction(high, denominator);
  return {
    low: lowFraction,
    high: highFraction,
    lowValue: lowFraction.decimal,
    highValue: highFraction.decimal,
  };
}

function makeDistribution(frequencies) {
  if (!frequencies || typeof frequencies !== 'object' || Array.isArray(frequencies)) {
    throw new TypeError('Arithmetic data must include a symbol-frequency table.');
  }
  const entries = Object.entries(frequencies);
  if (entries.length === 0 || entries.length > 256) {
    throw new RangeError('The frequency table must contain between 1 and 256 symbols.');
  }
  const sorted = entries
    .map(([symbol, frequency]) => {
      if (Array.from(symbol).length !== 1 || !Number.isSafeInteger(frequency) || frequency < 1) {
        throw new TypeError('Each arithmetic frequency must be a positive integer for one symbol.');
      }
      return [symbol, frequency];
    })
    .sort(([left], [right]) => left.codePointAt(0) - right.codePointAt(0));
  const total = sorted.reduce((sum, [, frequency]) => sum + frequency, 0);
  if (!Number.isSafeInteger(total)) throw new RangeError('The total symbol frequency is too large.');
  if (total > 1_000_000_000) throw new RangeError('Total arithmetic frequency cannot exceed 1,000,000,000.');
  let cumulative = 0;
  const intervals = sorted.map(([symbol, frequency]) => {
    const interval = { symbol, frequency, cumulativeLow: cumulative, cumulativeHigh: cumulative + frequency };
    cumulative += frequency;
    return interval;
  });
  return { intervals, total };
}

function lookupInterval(intervals, symbol) {
  const interval = intervals.find((item) => item.symbol === symbol);
  if (!interval) throw new RangeError(`Symbol "${symbol}" is missing from the arithmetic frequency table.`);
  return interval;
}

export function compressArithmetic(text, modelFrequencies) {
  const symbols = toSymbols(text);
  if (symbols.length === 0) throw new RangeError('Enter at least one character to compress.');
  const frequencies = modelFrequencies ?? {};
  if (!modelFrequencies) symbols.forEach((symbol) => { frequencies[symbol] = (frequencies[symbol] ?? 0) + 1; });
  const { intervals, total } = makeDistribution(frequencies);
  symbols.forEach((symbol) => lookupInterval(intervals, symbol));
  const steps = [step('arithmeticStart', {
    length: symbols.length,
    total,
    frequencies,
  })];
  let low = 0n;
  let high = 1n;
  let denominator = 1n;

  symbols.forEach((symbol, index) => {
    const interval = lookupInterval(intervals, symbol);
    const range = high - low;
    const oldLow = low;
    low = oldLow * BigInt(total) + range * BigInt(interval.cumulativeLow);
    high = oldLow * BigInt(total) + range * BigInt(interval.cumulativeHigh);
    denominator *= BigInt(total);
    steps.push(step('arithmeticEncode', {
      index,
      symbol,
      frequency: interval.frequency,
      cumulativeLow: interval.cumulativeLow,
      cumulativeHigh: interval.cumulativeHigh,
      ...intervalState(low, high, denominator),
    }));
  });

  let codeNumerator = low + high;
  let codeDenominator = 2n * denominator;
  for (let decimalPlaces = 3; decimalPlaces <= 64; decimalPlaces += 1) {
    const scale = 10n ** BigInt(decimalPlaces);
    const candidate = (high * scale) / denominator;
    if (candidate * denominator >= low * scale && candidate * denominator < high * scale) {
      codeNumerator = candidate;
      codeDenominator = scale;
      break;
    }
  }
  const payload = {
    numerator: codeNumerator.toString(),
    denominator: codeDenominator.toString(),
    length: symbols.length,
    frequencies,
  };
  steps.push(step('arithmeticComplete', {
    length: symbols.length,
    code: fraction(codeNumerator, codeDenominator),
    low: fraction(low, denominator),
    high: fraction(high, denominator),
  }));
  return { payload, steps };
}

function parsePayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new TypeError('Provide an arithmetic payload object.');
  }
  if (!Number.isSafeInteger(payload.length) || payload.length < 1 || payload.length > MAX_INPUT_LENGTH) {
    throw new RangeError(`Arithmetic payload length must be between 1 and ${MAX_INPUT_LENGTH}.`);
  }
  if (typeof payload.numerator !== 'string' || payload.numerator.length > 4096
    || typeof payload.denominator !== 'string' || payload.denominator.length > 4096
    || !/^\d+$/.test(payload.numerator) || !/^\d+$/.test(payload.denominator) || BigInt(payload.denominator) <= 0n) {
    throw new TypeError('Arithmetic payload must contain a valid non-negative rational code value.');
  }
  const numerator = BigInt(payload.numerator);
  const denominator = BigInt(payload.denominator);
  if (numerator >= denominator) throw new RangeError('Arithmetic code value must be less than 1.');
  const { intervals, total } = makeDistribution(payload.frequencies);
  return { numerator, denominator, intervals, total };
}

export function decompressArithmetic(payload) {
  const parsed = parsePayload(payload);
  const { numerator, denominator, intervals, total } = parsed;
  const steps = [step('arithmeticDecodeStart', {
    length: payload.length,
    code: fraction(numerator, denominator),
    total,
    frequencies: payload.frequencies,
  })];
  const output = [];
  let low = 0n;
  let high = 1n;
  let rangeDenominator = 1n;

  for (let index = 0; index < payload.length; index += 1) {
    const scaledNumerator = numerator * rangeDenominator - low * denominator;
    const scaledDenominator = (high - low) * denominator;
    if (scaledNumerator < 0n || scaledNumerator >= scaledDenominator) {
      throw new RangeError(`Arithmetic code is outside the current interval at symbol ${index + 1}.`);
    }
    const scaled = scaledNumerator * BigInt(total);
    const divisor = scaledDenominator;
    const interval = intervals.find((item) =>
      scaled >= BigInt(item.cumulativeLow) * divisor
      && scaled < BigInt(item.cumulativeHigh) * divisor);
    if (!interval) throw new RangeError(`Arithmetic code cannot identify symbol ${index + 1}.`);

    const oldLow = low;
    const range = high - low;
    low = oldLow * BigInt(total) + range * BigInt(interval.cumulativeLow);
    high = oldLow * BigInt(total) + range * BigInt(interval.cumulativeHigh);
    rangeDenominator *= BigInt(total);
    output.push(interval.symbol);
    steps.push(step('arithmeticDecode', {
      index,
      symbol: interval.symbol,
      cumulativeLow: interval.cumulativeLow,
      cumulativeHigh: interval.cumulativeHigh,
      ...intervalState(low, high, rangeDenominator),
      output: output.join(''),
    }));
  }

  const text = output.join('');
  steps.push(step('arithmeticDecodeComplete', {
    length: output.length,
    output: text,
  }));
  return { text, steps };
}
