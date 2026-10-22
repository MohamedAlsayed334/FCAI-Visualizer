import { describe, it, expect } from 'vitest';
import { getAlgorithm } from '../../application/AlgorithmRegistry';

const SEARCHING_IDS = ['linear-search', 'binary-search', 'jump-search'];

const FOUND_CASES = [
  { name: 'the first element', arr: [1, 3, 5, 7, 9], target: 1 },
  { name: 'the last element', arr: [1, 3, 5, 7, 9], target: 9 },
  { name: 'a value in the middle', arr: [1, 3, 5, 7, 9], target: 5 },
  { name: 'a repeated value', arr: [1, 3, 3, 5, 9], target: 3 },
  { name: 'the only element', arr: [42], target: 42 },
];

const MISSING_CASES = [
  { name: 'a value below the range', arr: [1, 3, 5, 7, 9], target: 0 },
  { name: 'a value above the range', arr: [1, 3, 5, 7, 9], target: 10 },
  { name: 'a value between two elements', arr: [1, 3, 5, 7, 9], target: 4 },
  { name: 'the only element', arr: [42], target: 7 },
  { name: 'an empty array', arr: [], target: 5 },
];

describe.each(SEARCHING_IDS)('%s', (id) => {
  const algorithm = getAlgorithm(id);

  it.each(FOUND_CASES)('finds $name', ({ arr, target }) => {
    const steps = algorithm.generateSteps({ arr: [...arr], target });
    const last = steps[steps.length - 1];

    expect(last.found).toBe(true);
    // Any index holding the target is correct — binary search does not have to
    // return the first occurrence.
    expect(arr[last.foundIdx]).toBe(target);
  });

  it.each(MISSING_CASES)('reports $name as not found', ({ arr, target }) => {
    const steps = algorithm.generateSteps({ arr: [...arr], target });
    const last = steps[steps.length - 1];

    expect(last.found).toBe(false);
    expect(last.foundIdx).toBe(-1);
  });

  it('narrates every step', () => {
    const steps = algorithm.generateSteps({ arr: [1, 3, 5, 7, 9], target: 5 });

    steps.forEach((step, index) => {
      const narrated =
        (typeof step.msg === 'string' && step.msg.trim().length > 0)
        || (typeof step.msgKey === 'string' && step.msgKey.trim().length > 0);

      expect(narrated, `step ${index} has no narration`).toBe(true);
    });
  });

  it('does not change the array it searches', () => {
    const arr = [1, 3, 5, 7, 9];
    const copy = [...arr];

    algorithm.generateSteps({ arr, target: 5 });

    expect(arr).toEqual(copy);
  });
});
