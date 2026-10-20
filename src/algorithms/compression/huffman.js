const MAX_INPUT_LENGTH = 256;

function symbolsOf(text) {
  if (typeof text !== 'string') throw new TypeError('Input text must be a string.');
  const symbols = Array.from(text);
  if (symbols.length > MAX_INPUT_LENGTH) {
    throw new RangeError(`Input text must contain at most ${MAX_INPUT_LENGTH} characters.`);
  }
  return symbols;
}

function step(type, msgKey, state = {}) {
  return { type, msgKey: `catalog:compression.steps.${msgKey}`, ...state };
}

function compareNodes(left, right) {
  return left.frequency - right.frequency
    || left.firstOrder - right.firstOrder
    || (left.symbol ?? '').localeCompare(right.symbol ?? '');
}

function makeTree(frequencies) {
  let order = 0;
  const queue = [...frequencies].map(([symbol, frequency]) => ({
    symbol,
    frequency,
    firstOrder: order++,
    left: null,
    right: null,
  })).sort(compareNodes);

  const merges = [];
  while (queue.length > 1) {
    const left = queue.shift();
    const right = queue.shift();
    const parent = {
      symbol: null,
      frequency: left.frequency + right.frequency,
      firstOrder: Math.min(left.firstOrder, right.firstOrder),
      left,
      right,
    };
    merges.push({ left: left.symbol ?? 'internal', right: right.symbol ?? 'internal', frequency: parent.frequency });
    queue.push(parent);
    queue.sort(compareNodes);
  }
  return { root: queue[0] ?? null, merges };
}

function buildCodebook(root) {
  const codebook = {};
  if (!root) return codebook;

  function visit(node, path) {
    if (node.symbol !== null) {
      codebook[node.symbol] = path || '0';
      return;
    }
    visit(node.left, `${path}0`);
    visit(node.right, `${path}1`);
  }
  visit(root, '');
  return codebook;
}

export function compressHuffman(text) {
  const symbols = symbolsOf(text);
  const frequencies = new Map();
  symbols.forEach((symbol) => frequencies.set(symbol, (frequencies.get(symbol) ?? 0) + 1));
  const sortedFrequencies = [...frequencies].sort(([left], [right]) => left.codePointAt(0) - right.codePointAt(0));
  const { root, merges } = makeTree(sortedFrequencies);
  const codebook = buildCodebook(root);
  const steps = [step('start', 'huffmanStart', { length: symbols.length })];

  sortedFrequencies.forEach(([symbol, frequency]) => {
    steps.push(step('huffman-frequency', 'huffmanFrequency', { symbol, frequency }));
  });
  merges.forEach((merge, index) => {
    steps.push(step('huffman-merge', 'huffmanMerge', {
      index: index + 1,
      left: merge.left,
      right: merge.right,
      frequency: merge.frequency,
    }));
  });

  const codes = [];
  let bits = '';
  symbols.forEach((symbol, index) => {
    const code = codebook[symbol];
    codes.push(code);
    bits += code;
    steps.push(step('huffman-encode', 'huffmanEncode', {
      index,
      symbol,
      code,
      bits,
    }));
  });
  steps.push(step('complete', 'huffmanComplete', {
    bitLength: bits.length,
    symbolCount: symbols.length,
  }));
  return { bits, codes, codebook, frequencies: Object.fromEntries(sortedFrequencies), steps };
}

export function compressModifiedHuffman(text, minimumProbability = 0.05) {
  const symbols = symbolsOf(text);
  if (!Number.isFinite(minimumProbability) || minimumProbability < 0 || minimumProbability > 1) {
    throw new RangeError('The minimum probability must be between 0 and 1.');
  }
  const counts = new Map();
  symbols.forEach((symbol) => counts.set(symbol, (counts.get(symbol) ?? 0) + 1));
  const sortedFrequencies = [...counts].sort(([left], [right]) => left.codePointAt(0) - right.codePointAt(0));
  const groups = [];
  const others = [];
  for (const [symbol, frequency] of sortedFrequencies) {
    if (frequency / Math.max(1, symbols.length) <= minimumProbability) others.push([symbol, frequency]);
    else groups.push({ symbol, frequency });
  }
  const othersFrequency = others.reduce((sum, [, frequency]) => sum + frequency, 0);
  if (others.length > 0) groups.push({ symbol: '\u0000Others', frequency: othersFrequency });

  const { root, merges } = makeTree(groups.map(({ symbol, frequency }) => [symbol, frequency]));
  const groupedCodes = buildCodebook(root);
  const codebook = {};
  const alphabet = sortedFrequencies.map(([symbol]) => symbol);
  const rawWidth = Math.max(1, Math.ceil(Math.log2(alphabet.length)));
  const rawCodes = new Map(alphabet.map((symbol, index) => [symbol, index.toString(2).padStart(rawWidth, '0')]));
  const othersCode = groupedCodes['\u0000Others'];
  groups.forEach(({ symbol }) => {
    if (symbol === '\u0000Others') return;
    codebook[symbol] = groupedCodes[symbol];
  });
  others.forEach(([symbol]) => {
    codebook[symbol] = `${othersCode}${rawCodes.get(symbol)}`;
  });

  const steps = [step('start', 'huffmanStart', { length: symbols.length })];
  sortedFrequencies.forEach(([symbol, frequency]) => {
    steps.push(step('huffman-frequency', 'huffmanFrequency', { symbol, frequency }));
  });
  steps.push(step('modifiedHuffmanGroups', 'modifiedHuffmanGroups', {
    threshold: minimumProbability,
    others: others.map(([symbol]) => symbol).join(', ') || 'none',
    othersFrequency,
  }));
  merges.forEach((merge, index) => {
    steps.push(step('huffman-merge', 'huffmanMerge', {
      index: index + 1,
      left: merge.left,
      right: merge.right,
      frequency: merge.frequency,
    }));
  });
  let bits = '';
  symbols.forEach((symbol, index) => {
    const code = codebook[symbol];
    bits += code;
    steps.push(step('huffman-encode', 'huffmanEncode', { index, symbol, code, bits }));
  });
  steps.push(step('huffmanComplete', 'huffmanComplete', {
    bitLength: bits.length,
    symbolCount: symbols.length,
  }));
  return {
    bits,
    codes: symbols.map((symbol) => codebook[symbol]),
    codebook,
    frequencies: Object.fromEntries(sortedFrequencies),
    threshold: minimumProbability,
    steps,
  };
}

function validateCodebook(codebook) {
  if (!codebook || typeof codebook !== 'object' || Array.isArray(codebook)) {
    throw new TypeError('Provide a Huffman codebook object.');
  }
  const entries = Object.entries(codebook);
  if (entries.length > 256) throw new RangeError('A Huffman codebook cannot contain more than 256 symbols.');
  for (const [symbol, code] of entries) {
    if (Array.from(symbol).length !== 1 || typeof code !== 'string' || !/^[01]+$/.test(code)) {
      throw new TypeError('Each Huffman codebook entry must map one symbol to a non-empty binary code.');
    }
  }
  for (const [symbol, code] of entries) {
    if (entries.some(([other, otherCode]) => other !== symbol && otherCode.startsWith(code))) {
      throw new TypeError('Huffman codes must be prefix-free.');
    }
  }
  return entries;
}

export function decompressHuffman(bits, codebook) {
  if (typeof bits !== 'string' || (bits && !/^[01]+$/.test(bits))) {
    throw new TypeError('Huffman data must contain only 0 and 1.');
  }
  if (bits.length > 65536) throw new RangeError('Huffman data cannot exceed 65,536 bits.');
  const entries = validateCodebook(codebook);
  const byCode = new Map(entries.map(([symbol, code]) => [code, symbol]));
  const steps = [step('start', 'huffmanDecodeStart', {
    bitLength: bits.length,
    codeCount: entries.length,
  })];
  const output = [];
  let prefix = '';

  Array.from(bits).forEach((bit, bitIndex) => {
    prefix += bit;
    const symbol = byCode.get(prefix);
    if (symbol !== undefined) {
      output.push(symbol);
      steps.push(step('huffman-decode', 'huffmanDecode', {
        bitIndex,
        code: prefix,
        symbol,
        output: output.join(''),
      }));
      prefix = '';
    } else if (!entries.some(([, code]) => code.startsWith(prefix))) {
      throw new RangeError(`Bits ending at position ${bitIndex + 1} do not match this codebook.`);
    }
  });

  if (prefix) throw new RangeError('The final Huffman code is incomplete.');
  const text = output.join('');
  steps.push(step('complete', 'huffmanDecodeComplete', {
    length: output.length,
    output: text,
  }));
  return { text, steps };
}

function findAdaptiveLeader(root, node) {
  const nodes = [];
  const visit = (current) => {
    if (!current) return;
    nodes.push(current);
    visit(current.left);
    visit(current.right);
  };
  visit(root);
  return nodes
    .filter((candidate) => candidate !== node
      && candidate.weight <= node.weight
      && candidate.order > node.order
      && candidate !== node.parent
      && !isAdaptiveAncestor(candidate, node)
      && !isAdaptiveAncestor(node, candidate))
    .sort((left, right) => right.order - left.order)[0] ?? node;
}

function isAdaptiveAncestor(ancestor, node) {
  let current = node.parent;
  while (current) {
    if (current === ancestor) return true;
    current = current.parent;
  }
  return false;
}

function replaceChild(parent, oldNode, newNode) {
  if (parent.left === oldNode) parent.left = newNode;
  else parent.right = newNode;
}

function swapAdaptiveNodes(left, right, root) {
  if (left === right) return root;
  const leftParent = left.parent;
  const rightParent = right.parent;
  if (leftParent && leftParent === rightParent) {
    if (leftParent.left === left) {
      leftParent.left = right;
      leftParent.right = left;
    } else {
      leftParent.right = right;
      leftParent.left = left;
    }
    [left.order, right.order] = [right.order, left.order];
    return root;
  }
  if (!leftParent) root = right;
  else replaceChild(leftParent, left, right);
  if (!rightParent) root = left;
  else replaceChild(rightParent, right, left);

  left.parent = rightParent;
  right.parent = leftParent;
  [left.order, right.order] = [right.order, left.order];
  return leftParent === null ? right : rightParent === null ? left : root;
}

function updateAdaptiveTree(node, root) {
  let current = node;
  while (current) {
    const leader = findAdaptiveLeader(root, current);
    if (leader !== current) root = swapAdaptiveNodes(current, leader, root);
    current.weight += 1;
    current = current.parent;
  }
  return root;
}

function adaptiveCode(node) {
  let code = '';
  let current = node;
  while (current?.parent) {
    code = (current.parent.right === current ? '1' : '0') + code;
    current = current.parent;
  }
  return code;
}

function symbolOrder(left, right) {
  return left.codePointAt(0) - right.codePointAt(0);
}

function serializeAdaptiveModel(root) {
  const result = [];
  const visit = (node, path) => {
    if (!node) return;
    if (node.symbol !== null || node.isNYT) {
      result.push({ symbol: node.isNYT ? 'NYT' : node.symbol, code: path || 'NYT', weight: node.weight, order: node.order });
      return;
    }
    visit(node.left, `${path}0`);
    visit(node.right, `${path}1`);
  };
  visit(root, '');
  return result;
}

function createAdaptiveModel() {
  return {
    root: { symbol: null, weight: 0, order: 1024, parent: null, left: null, right: null, isNYT: true },
    leaves: new Map(),
    nextOrder: 1023,
    nyt: null,
  };
}

function insertAdaptiveSymbol(model, symbol) {
  const nyt = model.nyt ?? model.root;
  const parent = {
    symbol: null,
    weight: 1,
    order: model.nextOrder--,
    parent: nyt.parent,
    left: null,
    right: null,
  };
  const newNyt = {
    symbol: null,
    weight: 0,
    order: model.nextOrder--,
    parent,
    left: null,
    right: null,
    isNYT: true,
  };
  const leaf = {
    symbol,
    weight: 1,
    order: model.nextOrder--,
    parent,
    left: null,
    right: null,
  };
  parent.left = newNyt;
  parent.right = leaf;
  if (!nyt.parent) model.root = parent;
  else replaceChild(nyt.parent, nyt, parent);
  model.nyt = newNyt;
  model.leaves.set(symbol, leaf);
  return { parent, leaf, newNyt };
}

function applyAdaptiveSymbol(model, symbol) {
  const existing = model.leaves.get(symbol);
  if (existing) {
    const path = adaptiveCode(existing);
    model.root = updateAdaptiveTree(existing, model.root);
    return { path, isNew: false };
  }
  const nytPath = adaptiveCode(model.nyt ?? model.root);
  const inserted = insertAdaptiveSymbol(model, symbol);
  model.root = updateAdaptiveTree(inserted.parent.parent, model.root);
  return { path: nytPath, nytPath, isNew: true };
}

export function compressAdaptiveHuffman(text) {
  const symbols = symbolsOf(text);
  const alphabet = [...new Set(symbols)].sort(symbolOrder);
  const shortWidth = Math.max(1, Math.ceil(Math.log2(alphabet.length)));
  const shortCodes = new Map(alphabet.map((symbol, index) => [
    symbol,
    index.toString(2).padStart(shortWidth, '0'),
  ]));
  const model = createAdaptiveModel();
  const events = [];
  const steps = [step('start', 'adaptiveStart', {
    length: symbols.length,
    shortWidth,
    alphabet: alphabet.join(''),
  })];

  symbols.forEach((symbol, index) => {
    const encoded = applyAdaptiveSymbol(model, symbol);
    const event = encoded.isNew
      ? { nytPath: encoded.nytPath, shortCode: shortCodes.get(symbol) }
      : { path: encoded.path };
    events.push(event);
    steps.push(step(encoded.isNew ? 'adaptive-new' : 'adaptive-known', encoded.isNew ? 'adaptiveNew' : 'adaptiveKnown', {
      index,
      symbol,
      code: encoded.isNew ? `${encoded.nytPath}${shortCodes.get(symbol)}` : encoded.path,
      shortCode: encoded.isNew ? shortCodes.get(symbol) : undefined,
      model: serializeAdaptiveModel(model.root),
    }));
  });

  const bits = events.map((event) => (event.nytPath !== undefined
    ? `${event.nytPath}${event.shortCode}`
    : event.path)).join('');
  steps.push(step('complete', 'adaptiveComplete', { symbolCount: symbols.length, eventCount: events.length }));
  return { alphabet, bits, events, steps, shortWidth };
}

export function decompressAdaptiveHuffman(payload) {
  const events = Array.isArray(payload) ? payload : payload?.events;
  const alphabet = Array.isArray(payload) ? [] : payload?.alphabet;
  if (!Array.isArray(events) || events.length > MAX_INPUT_LENGTH) {
    throw new TypeError(`Adaptive Huffman input must be an array of at most ${MAX_INPUT_LENGTH} events.`);
  }
  if (!Array.isArray(alphabet) || alphabet.length > 256
    || alphabet.some((symbol) => typeof symbol !== 'string' || Array.from(symbol).length !== 1)
    || new Set(alphabet).size !== alphabet.length) {
    throw new TypeError('Adaptive Huffman data must include a unique one-character alphabet.');
  }
  const sortedAlphabet = [...alphabet].sort(symbolOrder);
  const shortWidth = Math.max(1, Math.ceil(Math.log2(sortedAlphabet.length)));
  const symbolsByShortCode = new Map(sortedAlphabet.map((symbol, index) => [
    index.toString(2).padStart(shortWidth, '0'),
    symbol,
  ]));
  const model = createAdaptiveModel();
  model.nyt = model.root;
  const output = [];
  let decodedBits = '';
  const steps = [step('start', 'adaptiveDecodeStart', {
    eventCount: events.length,
    shortWidth,
    alphabet: sortedAlphabet.join(''),
  })];

  events.forEach((event, index) => {
    let symbol;
    let path;
    if (event?.nytPath !== undefined && typeof event.shortCode === 'string') {
      if (event.nytPath.length > 512 || !/^[01]*$/.test(event.nytPath)) {
        throw new RangeError(`Adaptive Huffman event ${index + 1} has an invalid NYT path.`);
      }
      const expectedPath = adaptiveCode(model.nyt);
      if (event.nytPath !== expectedPath) {
        throw new RangeError(`Adaptive Huffman event ${index + 1} does not match the current NYT path.`);
      }
      if (event.shortCode.length !== shortWidth || !/^[01]+$/.test(event.shortCode)) {
        throw new RangeError(`Adaptive Huffman event ${index + 1} has an invalid short code.`);
      }
      symbol = symbolsByShortCode.get(event.shortCode);
      if (symbol === undefined || model.leaves.has(symbol)) {
        throw new RangeError(`Adaptive Huffman event ${index + 1} does not identify a new alphabet symbol.`);
      }
      path = `${expectedPath}${event.shortCode}`;
    } else if (typeof event?.path === 'string') {
      if (event.path.length > 512) {
        throw new RangeError(`Adaptive Huffman event ${index + 1} path is too long.`);
      }
      let node = model.root;
      for (const bit of event.path) {
        if (bit !== '0' && bit !== '1') throw new TypeError('Adaptive Huffman paths contain only 0 and 1.');
        node = bit === '0' ? node.left : node.right;
        if (!node) throw new RangeError(`Adaptive Huffman event ${index + 1} has an invalid path.`);
      }
      if (node.symbol === null || node.isNYT) {
        throw new RangeError(`Adaptive Huffman event ${index + 1} does not identify a known symbol.`);
      }
      symbol = node.symbol;
      path = event.path;
    } else {
      throw new TypeError(`Adaptive Huffman event ${index + 1} is invalid.`);
    }

    output.push(symbol);
    decodedBits += path;
    applyAdaptiveSymbol(model, symbol);
    steps.push(step('adaptive-decode', 'adaptiveDecode', {
      index,
      symbol,
      code: path,
      output: output.join(''),
      model: serializeAdaptiveModel(model.root),
    }));
  });

  if (payload?.bits !== undefined && payload.bits !== decodedBits) {
    throw new RangeError('Adaptive Huffman bit stream does not match its event sequence.');
  }
  const text = output.join('');
  steps.push(step('complete', 'adaptiveDecodeComplete', {
    length: output.length,
    output: text,
  }));
  return { text, steps };
}
