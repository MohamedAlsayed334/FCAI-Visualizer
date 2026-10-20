const MAX_WINDOW_SIZE = 64;
const MAX_INPUT_LENGTH = 256;

function validateWindowSize(value, label) {
  if (!Number.isInteger(value) || value < 1 || value > MAX_WINDOW_SIZE) {
    throw new RangeError(`${label} must be an integer between 1 and ${MAX_WINDOW_SIZE}.`);
  }
}

function validateText(text) {
  if (typeof text !== 'string') {
    throw new TypeError('Input text must be a string.');
  }
  const symbols = Array.from(text);
  if (symbols.length > MAX_INPUT_LENGTH) {
    throw new RangeError(`Input text must contain at most ${MAX_INPUT_LENGTH} characters.`);
  }
  return symbols;
}

function createStep(type, msgKey, msgParams, state = {}) {
  return { type, msgKey: `catalog:compression.steps.${msgKey}`, msgParams, ...state };
}

export function compressLZ77(text, {
  searchBufferSize = 13,
  lookaheadBufferSize = 11,
} = {}) {
  validateWindowSize(searchBufferSize, 'Search buffer size');
  validateWindowSize(lookaheadBufferSize, 'Lookahead buffer size');
  const symbols = validateText(text);
  const tokens = [];
  const steps = [];
  let cursor = 0;

  steps.push(createStep('start', 'compressStart', { length: symbols.length }));

  while (cursor < symbols.length) {
    const searchStart = Math.max(0, cursor - searchBufferSize);
    const searchBuffer = symbols.slice(searchStart, cursor);
    const lookaheadBuffer = symbols.slice(cursor, cursor + lookaheadBufferSize);
    let bestLength = 0;
    let bestOffset = 0;
    let bestStart = -1;

    steps.push(createStep('window', 'window', {
      cursor,
      search: searchBuffer.join(''),
      lookahead: lookaheadBuffer.join(''),
    }, {
      cursor,
      searchStart,
      searchBuffer: searchBuffer.join(''),
      lookaheadBuffer: lookaheadBuffer.join(''),
      bestLength,
      bestOffset,
      tokenCount: tokens.length,
    }));

    for (let candidateStart = 0; candidateStart < searchBuffer.length; candidateStart += 1) {
      const matchPattern = searchBuffer.slice(candidateStart);
      const candidateOffset = searchBuffer.length - candidateStart;
      let length = 0;
      let matchedPrefix = '';

      while (length < lookaheadBuffer.length && length < matchPattern.length) {
        const expected = matchPattern[length];
        const actual = lookaheadBuffer[length];
        const matched = expected === actual;

        steps.push(createStep(matched ? 'match' : 'mismatch', matched ? 'match' : 'mismatch', {
          offset: candidateOffset,
          expected,
          actual,
          length: length + (matched ? 1 : 0),
        }, {
          cursor,
          searchStart,
          searchBuffer: searchBuffer.join(''),
          lookaheadBuffer: lookaheadBuffer.join(''),
          candidateStart,
          candidateOffset,
          matchedPrefix,
          matchIndex: length,
          expected,
          actual,
          matched,
          bestLength,
          bestOffset,
          tokenCount: tokens.length,
        }));

        if (!matched) break;
        matchedPrefix += actual;
        length += 1;
      }

      if (length > bestLength) {
        bestLength = length;
        bestOffset = candidateOffset;
        bestStart = candidateStart;
        steps.push(createStep('best-match', 'newBest', {
          offset: bestOffset,
          length: bestLength,
          match: matchedPrefix,
        }, {
          cursor,
          searchStart,
          searchBuffer: searchBuffer.join(''),
          lookaheadBuffer: lookaheadBuffer.join(''),
          candidateStart,
          candidateOffset,
          matchedPrefix,
          bestLength,
          bestOffset,
          bestStart,
          tokenCount: tokens.length,
        }));
      } else if (length > 0 && length === bestLength) {
        bestOffset = candidateOffset;
        bestStart = candidateStart;
        steps.push(createStep('closer-match', 'closerMatch', {
          offset: bestOffset,
          length: bestLength,
        }, {
          cursor,
          searchStart,
          searchBuffer: searchBuffer.join(''),
          lookaheadBuffer: lookaheadBuffer.join(''),
          candidateStart,
          candidateOffset,
          matchedPrefix,
          bestLength,
          bestOffset,
          bestStart,
          tokenCount: tokens.length,
        }));
      }
    }

    const nextChar = symbols[cursor + bestLength] ?? null;
    const token = { offset: bestOffset, length: bestLength, nextChar };
    tokens.push(token);
    const tokenIndex = tokens.length - 1;

    steps.push(createStep('emit-token', 'emitToken', {
      offset: token.offset,
      length: token.length,
      nextChar: token.nextChar === null ? '∅' : token.nextChar,
    }, {
      cursor,
      searchStart,
      searchBuffer: searchBuffer.join(''),
      lookaheadBuffer: lookaheadBuffer.join(''),
      bestLength,
      bestOffset,
      bestStart,
      nextChar,
      tokenIndex,
      tokenCount: tokens.length,
      token,
    }));

    cursor += bestLength + 1;
    steps.push(createStep('advance', 'advance', {
      cursor,
    }, {
      cursor,
      searchStart,
      searchBuffer: searchBuffer.join(''),
      lookaheadBuffer: lookaheadBuffer.join(''),
      bestLength,
      bestOffset,
      tokenCount: tokens.length,
    }));
  }

  steps.push(createStep('complete', 'compressComplete', {
    tokens: tokens.length,
  }, {
    cursor,
    tokenCount: tokens.length,
  }));

  return { tokens, steps };
}

function validateTokens(tokens) {
  if (!Array.isArray(tokens)) {
    throw new TypeError('Compressed data must be an array of LZ77 tokens.');
  }

  return tokens.map((token, index) => {
    if (!token || !Number.isInteger(token.offset) || !Number.isInteger(token.length)) {
      throw new TypeError(`Token ${index + 1} must have integer offset and length values.`);
    }
    if (token.offset < 0 || token.length < 0) {
      throw new RangeError(`Token ${index + 1} cannot have a negative offset or length.`);
    }
    if (token.offset === 0 && token.length !== 0) {
      throw new RangeError(`Token ${index + 1} cannot copy data with a zero offset.`);
    }
    if (token.length > MAX_INPUT_LENGTH) {
      throw new RangeError(`Token ${index + 1} exceeds the ${MAX_INPUT_LENGTH}-character limit.`);
    }
    if (token.nextChar !== null && (typeof token.nextChar !== 'string' || Array.from(token.nextChar).length !== 1)) {
      throw new TypeError(`Token ${index + 1} must end with one character or null.`);
    }
    return token;
  });
}

export function parseLZ77Tokens(source) {
  if (typeof source !== 'string') {
    throw new TypeError('Enter LZ77 tags as text.');
  }
  if (source.length > 16384) {
    throw new RangeError('LZ77 tag input cannot exceed 16,384 characters.');
  }
  const tags = source.trim();
  if (!tags) throw new TypeError('Enter at least one LZ77 tag.');

  const tokens = [];
  let position = 0;
  while (position < tags.length) {
    while (/\s/.test(tags[position] ?? '')) position += 1;
    if (position >= tags.length) break;

    const match = /^<\s*(\d+)\s*,\s*(\d+)\s*,\s*([^<>]*?)\s*>/u.exec(tags.slice(position));
    if (!match) {
      throw new TypeError(`Could not read an LZ77 tag near: ${tags.slice(position, position + 24)}`);
    }

    const nextValue = match[3];
    const normalizedNext = nextValue.trim();
    let nextChar = null;
    if (normalizedNext && !['null', '∅', 'EOF', 'eof'].includes(normalizedNext)) {
      nextChar = nextValue === 'space' ? ' ' : nextValue;
      if (Array.from(nextChar).length !== 1) {
        throw new TypeError('Use one next symbol per tag; write "space" for a space or "null" for no symbol.');
      }
    }

    tokens.push({
      offset: Number(match[1]),
      length: Number(match[2]),
      nextChar,
    });
    position += match[0].length;
  }

  if (tokens.length > MAX_INPUT_LENGTH) {
    throw new RangeError(`Enter no more than ${MAX_INPUT_LENGTH} LZ77 tags.`);
  }
  return validateTokens(tokens);
}

export function decompressLZ77(tokens) {
  const validTokens = validateTokens(tokens);
  const output = [];
  const steps = [
    createStep('start', 'decompressStart', { tokens: validTokens.length }, {
      tokenIndex: -1,
      output: '',
      tokenCount: validTokens.length,
    }),
  ];

  validTokens.forEach((token, tokenIndex) => {
    if (token.offset > output.length) {
      throw new RangeError(
        `Token ${tokenIndex + 1} refers ${token.offset} characters back, but only ${output.length} have been decoded.`,
      );
    }

    const copyStart = output.length - token.offset;
    steps.push(createStep('read-token', 'readToken', {
      index: tokenIndex + 1,
      offset: token.offset,
      length: token.length,
      nextChar: token.nextChar === null ? '∅' : token.nextChar,
    }, {
      tokenIndex,
      token,
      output: output.join(''),
      copyStart,
      tokenCount: validTokens.length,
    }));

    for (let index = 0; index < token.length; index += 1) {
      if (output.length >= MAX_INPUT_LENGTH) {
        throw new RangeError(`Decoded output cannot exceed ${MAX_INPUT_LENGTH} characters.`);
      }
      const sourceIndex = copyStart + index;
      const copied = output[sourceIndex];
      output.push(copied);
      steps.push(createStep('copy-character', 'copyCharacter', {
        value: copied,
        from: sourceIndex,
        to: output.length - 1,
      }, {
        tokenIndex,
        token,
        output: output.join(''),
        copyStart,
        sourceIndex,
        outputIndex: output.length - 1,
        copied,
        tokenCount: validTokens.length,
      }));
    }

    if (token.nextChar !== null) {
      if (output.length >= MAX_INPUT_LENGTH) {
        throw new RangeError(`Decoded output cannot exceed ${MAX_INPUT_LENGTH} characters.`);
      }
      output.push(token.nextChar);
      steps.push(createStep('append-character', 'appendCharacter', {
        value: token.nextChar,
        index: output.length - 1,
      }, {
        tokenIndex,
        token,
        output: output.join(''),
        copyStart,
        outputIndex: output.length - 1,
        appended: token.nextChar,
        tokenCount: validTokens.length,
      }));
    }
  });

  steps.push(createStep('complete', 'decompressComplete', {
    length: output.length,
  }, {
    tokenIndex: validTokens.length,
    output: output.join(''),
    tokenCount: validTokens.length,
  }));

  return { text: output.join(''), steps };
}

export const LZ77_LIMITS = {
  maxInputLength: MAX_INPUT_LENGTH,
  maxWindowSize: MAX_WINDOW_SIZE,
};
