import { describe, it, expect } from 'vitest';
import {
  compressHuffman,
  compressModifiedHuffman,
  decompressHuffman,
  compressAdaptiveHuffman,
  decompressAdaptiveHuffman,
} from './huffman.js';
import { compressArithmetic, decompressArithmetic } from './arithmetic.js';
import { compressLZ77, decompressLZ77, LZ77_LIMITS } from './lz77.js';
import { compressLZ78, decompressLZ78, compressLZW, decompressLZW } from './dictionary.js';

const TEXTS = [
  { name: 'an empty text', text: '' },
  { name: 'a single character', text: 'a' },
  { name: 'a repeated word', text: 'banana' },
  { name: 'one repeated character', text: 'aaaa' },
  { name: 'the lecture example', text: 'ABAABABAABBBBBBBBBBBBA' },
  { name: 'a text with spaces', text: 'the quick brown fox jumps over the lazy dog' },
  { name: 'non-ascii characters', text: 'héllo wörld 日本語' },
];

/** The lecture LZW implementation only accepts 7-bit ASCII. */
const isAscii = (text) => [...text].every((character) => character.codePointAt(0) <= 127);

describe('Huffman coding', () => {
  it.each(TEXTS)('round-trips $name', ({ text }) => {
    const compressed = compressHuffman(text);
    const decompressed = decompressHuffman(compressed.bits, compressed.codebook);

    expect(decompressed.text).toBe(text);
  });

  it.each(TEXTS)('round-trips $name with modified Huffman', ({ text }) => {
    const compressed = compressModifiedHuffman(text);
    const decompressed = decompressHuffman(compressed.bits, compressed.codebook);

    expect(decompressed.text).toBe(text);
  });

  it.each(TEXTS)('round-trips $name with adaptive Huffman', ({ text }) => {
    const compressed = compressAdaptiveHuffman(text);
    const decompressed = decompressAdaptiveHuffman(compressed);

    expect(decompressed.text).toBe(text);
  });

  it('gives every symbol a prefix-free code', () => {
    const { codebook } = compressHuffman('banana');
    const codes = Object.values(codebook);

    codes.forEach((code) => {
      expect(code).toMatch(/^[01]+$/);
      codes.forEach((other) => {
        if (code === other) return;
        expect(other.startsWith(code)).toBe(false);
      });
    });
  });

  it('counts the frequency of every symbol', () => {
    const { frequencies } = compressHuffman('banana');

    expect(frequencies).toEqual({ a: 3, b: 1, n: 2 });
  });

  it('rejects a codebook that is not prefix-free', () => {
    expect(() => decompressHuffman('01', { a: '0', b: '01' })).toThrow();
  });
});

describe('arithmetic coding', () => {
  it.each(TEXTS.filter(({ text }) => text.length > 0))('round-trips $name', ({ text }) => {
    const compressed = compressArithmetic(text);
    const decompressed = decompressArithmetic(compressed.payload);

    expect(decompressed.text).toBe(text);
  });

  it('needs at least one character', () => {
    expect(() => compressArithmetic('')).toThrow(/at least one character/);
  });

  it('rejects a payload that is not a fraction below one', () => {
    expect(() => decompressArithmetic({
      numerator: '2',
      denominator: '1',
      length: 1,
      frequencies: { a: 1 },
    })).toThrow();
  });
});

describe('LZ77', () => {
  it.each(TEXTS)('round-trips $name', ({ text }) => {
    const compressed = compressLZ77(text);
    const decompressed = decompressLZ77(compressed.tokens);

    expect(decompressed.text).toBe(text);
  });

  it('reuses a previous match instead of repeating the text', () => {
    const compressed = compressLZ77('abcabcabcabc');

    expect(compressed.tokens.length).toBeLessThan(12);
  });

  it('rejects a text that is not a string', () => {
    expect(() => compressLZ77(42)).toThrow(/must be a string/);
  });

  it('publishes its limits', () => {
    expect(LZ77_LIMITS.maxInputLength).toBeGreaterThan(0);
    expect(LZ77_LIMITS.maxWindowSize).toBeGreaterThan(0);
  });
});

describe('LZ78', () => {
  it.each(TEXTS)('round-trips $name', ({ text }) => {
    const compressed = compressLZ78(text);
    const decompressed = decompressLZ78(compressed.tokens);

    expect(decompressed.text).toBe(text);
  });

  it('grows its dictionary while compressing', () => {
    const compressed = compressLZ78('abcabcabc');

    expect(compressed.dictionary.length).toBeGreaterThan(0);
  });
});

describe('LZW', () => {
  it.each(TEXTS.filter(({ text }) => isAscii(text)))(
    'round-trips $name',
    ({ text }) => {
      const compressed = compressLZW(text);
      const decompressed = decompressLZW(compressed.codes);

      expect(decompressed.text).toBe(text);
    },
  );

  it('accepts 7-bit ASCII only', () => {
    expect(() => compressLZW('héllo')).toThrow(/ASCII/);
  });
});
