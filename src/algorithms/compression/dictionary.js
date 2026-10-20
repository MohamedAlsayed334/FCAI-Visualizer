const MAX_INPUT_LENGTH = 256;

function textSymbols(text) {
  if (typeof text !== 'string') throw new TypeError('Input text must be a string.');
  const symbols = Array.from(text);
  if (symbols.length > MAX_INPUT_LENGTH) {
    throw new RangeError(`Input text must contain at most ${MAX_INPUT_LENGTH} characters.`);
  }
  return symbols;
}

function step(type, msg, state = {}) {
  return { type, msgKey: `catalog:compression.steps.${msg}`, ...state };
}

export function compressLZ78(text) {
  const symbols = textSymbols(text);
  const dictionary = [''];
  const indices = new Map([['', 0]]);
  const tokens = [];
  const steps = [step('start', 'lz78Start', { cursor: 0, phrase: '' })];
  let phrase = '';

  symbols.forEach((symbol, cursor) => {
    const candidate = phrase + symbol;
    const known = indices.has(candidate);
    steps.push(step(known ? 'dictionary-hit' : 'dictionary-miss', known ? 'lz78Hit' : 'lz78Miss', {
      cursor,
      phrase: candidate,
      index: indices.get(candidate) ?? dictionary.length,
      symbol,
      dictionarySize: dictionary.length - 1,
    }));

    if (known) {
      phrase = candidate;
      return;
    }

    const token = { index: indices.get(phrase), nextChar: symbol };
    tokens.push(token);
    dictionary.push(candidate);
    indices.set(candidate, dictionary.length - 1);
    steps.push(step('emit-token', 'lz78Emit', {
      cursor,
      tokenIndex: tokens.length - 1,
      token,
      phrase: candidate,
      dictionaryEntry: dictionary.length - 1,
      dictionarySize: dictionary.length - 1,
    }));
    phrase = '';
  });

  if (phrase) {
    const token = { index: indices.get(phrase), nextChar: null };
    tokens.push(token);
    steps.push(step('emit-terminal', 'lz78Terminal', {
      tokenIndex: tokens.length - 1,
      token,
      phrase,
      dictionarySize: dictionary.length - 1,
    }));
  }

  steps.push(step('complete', 'lz78Complete', {
    tokenCount: tokens.length,
    dictionarySize: dictionary.length - 1,
  }));
  return { tokens, dictionary: dictionary.slice(1), steps };
}

function validateLZ78Tokens(tokens) {
  if (!Array.isArray(tokens) || tokens.length > MAX_INPUT_LENGTH) {
    throw new TypeError(`LZ78 input must be an array of at most ${MAX_INPUT_LENGTH} tags.`);
  }
  return tokens.map((token, index) => {
    if (!token || !Number.isInteger(token.index) || token.index < 0) {
      throw new TypeError(`LZ78 tag ${index + 1} must have a non-negative integer index.`);
    }
    if (token.nextChar !== null && (typeof token.nextChar !== 'string' || Array.from(token.nextChar).length !== 1)) {
      throw new TypeError(`LZ78 tag ${index + 1} must have one next character or null.`);
    }
    return token;
  });
}

export function decompressLZ78(tokens) {
  const validTokens = validateLZ78Tokens(tokens);
  const dictionary = [''];
  const output = [];
  const steps = [step('start', 'lz78DecodeStart', { tokenCount: validTokens.length })];

  validTokens.forEach((token, tokenIndex) => {
    if (token.index >= dictionary.length) {
      throw new RangeError(`LZ78 tag ${tokenIndex + 1} refers to dictionary entry ${token.index}, which does not exist yet.`);
    }
    if (token.nextChar === null && tokenIndex !== validTokens.length - 1) {
      throw new RangeError('Only the final LZ78 tag may omit its next character.');
    }

    const phrase = dictionary[token.index] + (token.nextChar ?? '');
    if (token.nextChar === null && phrase.length === 0) {
      throw new RangeError('An LZ78 terminal tag must refer to a non-empty dictionary phrase.');
    }
    output.push(phrase);
    steps.push(step('decode-token', token.nextChar === null ? 'lz78DecodeTerminal' : 'lz78DecodeTag', {
      tokenIndex,
      token,
      phrase,
      output: output.join(''),
      dictionarySize: dictionary.length - 1,
    }));
    if (token.nextChar !== null) dictionary.push(phrase);
    if (Array.from(output.join('')).length > MAX_INPUT_LENGTH) {
      throw new RangeError(`Decoded output cannot exceed ${MAX_INPUT_LENGTH} characters.`);
    }
  });

  const text = output.join('');
  steps.push(step('complete', 'lz78DecodeComplete', {
    length: Array.from(text).length,
    dictionarySize: dictionary.length - 1,
    output: text,
  }));
  return { text, dictionary: dictionary.slice(1), steps };
}

export function compressLZW(text) {
  const symbols = textSymbols(text);
  if (symbols.some((symbol) => symbol.codePointAt(0) > 127)) {
    throw new RangeError('The lecture LZW implementation accepts 7-bit ASCII symbols only.');
  }
  const dictionary = new Map(Array.from({ length: 128 }, (_, code) => [String.fromCharCode(code), code]));
  const phrases = new Map(Array.from({ length: 128 }, (_, code) => [code, String.fromCharCode(code)]));
  const codes = [];
  const steps = [step('start', 'lzwStart', {
    firstNewCode: 128,
    alphabetSize: 128,
    dictionarySize: dictionary.size,
  })];
  let phrase = '';

  symbols.forEach((symbol, cursor) => {
    const candidate = phrase + symbol;
    if (dictionary.has(candidate)) {
      phrase = candidate;
      steps.push(step('lzw-extend', 'lzwExtend', {
        cursor,
        phrase,
        code: dictionary.get(phrase),
        dictionarySize: dictionary.size,
      }));
      return;
    }

    const code = dictionary.get(phrase);
    if (code === undefined) {
      throw new Error('LZW could not find the current phrase in its dictionary.');
    }
    codes.push(code);
    const newCode = Math.max(...dictionary.values()) + 1;
    dictionary.set(candidate, newCode);
    phrases.set(newCode, candidate);
    steps.push(step('lzw-add', 'lzwAdd', {
      cursor,
      phrase,
      code,
      added: candidate,
      addedCode: newCode,
      dictionarySize: dictionary.size,
      codeCount: codes.length,
    }));
    phrase = symbol;
  });

  if (phrase) {
    const code = dictionary.get(phrase);
    codes.push(code);
    steps.push(step('lzw-emit-final', 'lzwEmitFinal', {
      phrase,
      code,
      codeCount: codes.length,
      dictionarySize: dictionary.size,
    }));
  }

  steps.push(step('complete', 'lzwComplete', {
    codeCount: codes.length,
    dictionarySize: dictionary.size,
  }));
  return { codes, dictionary: phrases, steps };
}

export function decompressLZW(codes) {
  if (!Array.isArray(codes) || codes.length > MAX_INPUT_LENGTH) {
    throw new TypeError(`LZW decoding requires an array of at most ${MAX_INPUT_LENGTH} codes.`);
  }
  if (!codes.every((code) => Number.isInteger(code) && code >= 0)) {
    throw new TypeError('LZW codes must be non-negative integers.');
  }

  const dictionary = Array.from({ length: 128 }, (_, code) => String.fromCharCode(code));
  const steps = [step('start', 'lzwDecodeStart', {
    alphabetSize: 128,
    codeCount: codes.length,
  })];
  if (codes.length === 0) {
    return { text: '', dictionary, steps: [...steps, step('complete', 'lzwDecodeComplete', { length: 0, output: '' })] };
  }

  let previous = dictionary[codes[0]];
  if (previous === undefined) throw new RangeError(`Initial LZW code ${codes[0]} is not in the alphabet.`);
  const output = [previous];

  codes.slice(1).forEach((code, index) => {
    const dictionaryEntry = dictionary[code];
    const entry = dictionaryEntry ?? (code === dictionary.length ? previous + Array.from(previous)[0] : undefined);
    if (entry === undefined) {
      throw new RangeError(`LZW code ${code} is not in the dictionary at step ${index + 2}.`);
    }

    output.push(entry);
    const added = previous + Array.from(entry)[0];
    dictionary.push(added);
    steps.push(step(dictionaryEntry === undefined ? 'lzw-special' : 'lzw-decode-code', dictionaryEntry === undefined ? 'lzwDecodeSpecial' : 'lzwDecodeCode', {
      tokenIndex: index + 1,
      code,
      entry,
      previous,
      added,
      addedCode: dictionary.length - 1,
      output: output.join(''),
      dictionarySize: dictionary.length,
    }));
    previous = entry;

    if (Array.from(output.join('')).length > MAX_INPUT_LENGTH) {
      throw new RangeError(`Decoded output cannot exceed ${MAX_INPUT_LENGTH} characters.`);
    }
  });

  const text = output.join('');
  steps.push(step('complete', 'lzwDecodeComplete', {
    length: Array.from(text).length,
    dictionarySize: dictionary.length,
    output: text,
  }));
  return { text, dictionary, steps };
}
