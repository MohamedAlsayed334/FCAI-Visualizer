import { describe, it, expect } from 'vitest';
import { getAlgorithm } from '../../application/AlgorithmRegistry';

const SORTING_IDS = [
  'bubble',
  'selection',
  'insertion',
  'merge',
  'quick',
  'heap',
  'counting',
  'radix',
];

// Fixed inputs only — the default inputs of the sorting algorithms are random,
// which would make the suite flaky.
const CASES = [
  { name: 'a normal array', input: [5, 3, 8, 1, 9, 2] },
  { name: 'an array with duplicates', input: [3, 1, 3, 2, 1] },
  { name: 'an already sorted array', input: [1, 2, 3, 4, 5] },
  { name: 'a reversed array', input: [5, 4, 3, 2, 1] },
  { name: 'a single element', input: [42] },
  { name: 'an empty array', input: [] },
  { name: 'one repeated value', input: [7, 7, 7] },
];

const sortedCopy = (values) => [...values].sort((a, b) => a - b);

/** The array the visualizer ends on: `arr`, or `outputArr` for counting sort. */
const finalArrayOf = (steps) => {
  const last = steps[steps.length - 1];
  return last.arr ?? last.outputArr ?? [];
};

describe.each(SORTING_IDS)('%s', (id) => {
  const algorithm = getAlgorithm(id);

  it.each(CASES)('sorts $name', ({ input }) => {
    const steps = algorithm.generateSteps(input);

    expect(steps.length).toBeGreaterThan(0);
    expect(finalArrayOf(steps)).toEqual(sortedCopy(input));
  });

  it.each(CASES)('keeps every value of $name', ({ input }) => {
    const steps = algorithm.generateSteps(input);
    const final = finalArrayOf(steps);

    // Same values, same multiplicity — sorting must not drop or invent elements.
    expect([...final].sort((a, b) => a - b)).toEqual([...input].sort((a, b) => a - b));
  });

  it('narrates every step', () => {
    const steps = algorithm.generateSteps([5, 3, 8, 1]);

    steps.forEach((step, index) => {
      const narrated =
        (typeof step.msg === 'string' && step.msg.trim().length > 0)
        || (typeof step.msgKey === 'string' && step.msgKey.trim().length > 0);

      expect(narrated, `step ${index} has no narration`).toBe(true);
    });
  });
});

describe('sorting edge cases', () => {
  it('keeps the input untouched', () => {
    const input = [5, 3, 8, 1];
    const copy = [...input];

    getAlgorithm('quick').generateSteps(input);

    expect(input).toEqual(copy);
  });

  it('sorts the same array the same way twice', () => {
    const input = [9, 2, 7, 4, 1];

    const first = finalArrayOf(getAlgorithm('merge').generateSteps(input));
    const second = finalArrayOf(getAlgorithm('merge').generateSteps(input));

    expect(first).toEqual(second);
  });
});

// Known limitations. `it.fails` records them as expected failures: the suite
// stays green, but the moment someone fixes the algorithm this test starts
// failing and asks for an update. Both bugs are reachable from the Sorting
// page through the "custom input" field, which accepts negative numbers.
describe('known limitations', () => {
  it.fails('counting sort does not handle negative values yet', () => {
    const input = [-3, 5, 0, -1, 2];
    const steps = getAlgorithm('counting').generateSteps(input);

    expect(finalArrayOf(steps)).toEqual(sortedCopy(input));
  });

  it.fails('radix sort does not handle negative values yet', () => {
    expect(() => getAlgorithm('radix').generateSteps([-3, 5, 0, -1, 2])).not.toThrow();
  });
});
