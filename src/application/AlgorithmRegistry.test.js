import { describe, it, expect } from 'vitest';
import {
  getAlgorithm,
  getAllAlgorithms,
  getAlgorithmsByCategory,
  getAlgorithmIds,
} from './AlgorithmRegistry';

const LANGUAGES = ['js', 'python', 'cpp', 'java', 'csharp'];
const algorithms = getAllAlgorithms();

describe('AlgorithmRegistry', () => {
  it('registers algorithms under unique ids', () => {
    const ids = getAlgorithmIds();

    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('exposes the same ids through both helpers', () => {
    expect(getAlgorithmIds()).toEqual(algorithms.map((algorithm) => algorithm.id));
  });

  it('looks an algorithm up by id', () => {
    const algorithm = getAlgorithm('bubble');

    expect(algorithm.id).toBe('bubble');
    expect(typeof algorithm.generateSteps).toBe('function');
    expect(typeof algorithm.getDefaultInput).toBe('function');
  });

  it('throws a helpful error for an unknown id', () => {
    expect(() => getAlgorithm('not-a-real-algorithm')).toThrow(/not found in registry/);
  });

  it('groups algorithms by category', () => {
    const sorting = getAlgorithmsByCategory('sorting');

    expect(sorting.length).toBeGreaterThan(0);
    expect(sorting.every((algorithm) => algorithm.category === 'sorting')).toBe(true);
    expect(getAlgorithmsByCategory('not-a-category')).toEqual([]);
  });

  it('gives every algorithm a name and a category', () => {
    for (const algorithm of algorithms) {
      expect(typeof algorithm.id, `${algorithm.id}.id`).toBe('string');
      expect(typeof algorithm.category, `${algorithm.id}.category`).toBe('string');
      expect(typeof algorithm.name, `${algorithm.id}.name`).toBe('string');
    }
  });
});

// One loop over the registry covers every algorithm — including the ones added
// later. This is the contract AGENTS.md describes under "The Step contract".
describe('every registered algorithm honours the Step contract', () => {
  it('has a default input to play back', () => {
    for (const algorithm of algorithms) {
      expect(algorithm.getDefaultInput(), `${algorithm.id} default input`).not.toBeNull();
      expect(algorithm.getDefaultInput(), `${algorithm.id} default input`).not.toBeUndefined();
    }
  });

  it('produces a non-empty list of steps', () => {
    for (const algorithm of algorithms) {
      const steps = algorithm.generateSteps(algorithm.getDefaultInput());

      expect(Array.isArray(steps), `${algorithm.id} steps`).toBe(true);
      expect(steps.length, `${algorithm.id} step count`).toBeGreaterThan(0);
    }
  });

  it('gives every step a human-readable narration', () => {
    for (const algorithm of algorithms) {
      const steps = algorithm.generateSteps(algorithm.getDefaultInput());

      steps.forEach((step, index) => {
        // `msg` is the legacy narration, `msgKey` the translated one.
        // stepText() prefers msgKey, so either one is enough to narrate a step.
        const hasMessage = typeof step.msg === 'string' && step.msg.trim().length > 0;
        const hasMessageKey = typeof step.msgKey === 'string' && step.msgKey.trim().length > 0;

        expect(hasMessage || hasMessageKey, `${algorithm.id} step ${index} has no narration`).toBe(true);
      });
    }
  });

  it('keeps the array-shaped playback fields as arrays', () => {
    for (const algorithm of algorithms) {
      const steps = algorithm.generateSteps(algorithm.getDefaultInput());

      steps.forEach((step, index) => {
        for (const field of ['arr', 'compare', 'swap', 'sorted']) {
          const value = step[field];
          if (value === undefined || value === null) continue;

          expect(Array.isArray(value), `${algorithm.id} step ${index}.${field}`).toBe(true);
        }
      });
    }
  });

  it('only uses supported languages in codeLines', () => {
    for (const algorithm of algorithms) {
      const steps = algorithm.generateSteps(algorithm.getDefaultInput());

      steps.forEach((step, index) => {
        const codeLines = step.codeLines;
        if (!codeLines) return;

        for (const [language, line] of Object.entries(codeLines)) {
          expect(LANGUAGES, `${algorithm.id} step ${index} codeLines.${language}`).toContain(language);
          expect(typeof line, `${algorithm.id} step ${index} codeLines.${language}`).toBe('number');
        }
      });
    }
  });

  it('points at a line that exists in the code snippet of every language', () => {
    for (const algorithm of algorithms) {
      const snippets = algorithm.codeSnippets ?? {};
      const languages = Object.keys(snippets);
      if (languages.length === 0) continue;

      const steps = algorithm.generateSteps(algorithm.getDefaultInput());

      steps.forEach((step, index) => {
        languages.forEach((language) => {
          const line = step.codeLines?.[language];
          if (typeof line !== 'number' || line < 0) return;

          expect(
            line,
            `${algorithm.id} step ${index} highlights line ${line} of the ${language} snippet`,
          ).toBeLessThan(snippets[language].length);
        });
      });
    }
  });
});

// The code panel shows `codeLines[language]` when it exists and falls back to
// the legacy `codeLine` otherwise. The legacy value was written for the
// JavaScript snippet, so it can point past the end of a shorter snippet.
describe('known limitations', () => {
  it.fails('the fallback code line exists in every snippet', () => {
    const outOfRange = [];

    for (const algorithm of algorithms) {
      const snippets = algorithm.codeSnippets ?? {};
      const languages = Object.keys(snippets);
      if (languages.length === 0) continue;

      const steps = algorithm.generateSteps(algorithm.getDefaultInput());

      steps.forEach((step, index) => {
        languages.forEach((language) => {
          if (step.codeLines?.[language] !== undefined) return;

          const line = step.codeLine;
          if (typeof line !== 'number' || line < 0) return;
          if (line < snippets[language].length) return;

          outOfRange.push(`${algorithm.id} step ${index} → ${language} line ${line}`);
        });
      });
    }

    expect(outOfRange).toEqual([]);
  });
});
