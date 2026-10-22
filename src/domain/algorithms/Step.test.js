import { describe, it, expect } from 'vitest';
import { Step } from './Step';

describe('Step', () => {
  it('fills the optional playback fields with safe defaults', () => {
    const step = new Step({});

    expect(step.arr).toBeUndefined();
    expect(step.compare).toBeNull();
    expect(step.swap).toBeNull();
    expect(step.sorted).toBeNull();
    expect(step.current).toBeNull();
    expect(step.found).toBeNull();
    expect(step.msg).toBe('');
    expect(step.codeLine).toBe(-1);
    expect(step.codeLines).toBeNull();
  });

  it('keeps the values it is given', () => {
    const step = new Step({
      arr: [1, 2, 3],
      compare: [0],
      swap: [1, 2],
      sorted: [0, 1, 2],
      current: 2,
      found: 3,
      msg: 'Compared a[0] and a[1]',
      codeLine: 7,
      codeLines: { js: 7, python: 4 },
    });

    expect(step.arr).toEqual([1, 2, 3]);
    expect(step.compare).toEqual([0]);
    expect(step.swap).toEqual([1, 2]);
    expect(step.sorted).toEqual([0, 1, 2]);
    expect(step.current).toBe(2);
    expect(step.found).toBe(3);
    expect(step.msg).toBe('Compared a[0] and a[1]');
    expect(step.codeLine).toBe(7);
    expect(step.codeLines).toEqual({ js: 7, python: 4 });
  });

  it('turns a missing narration into an empty string', () => {
    expect(new Step({}).msg).toBe('');
    expect(new Step({ msg: null }).msg).toBe('');
  });

  it('keeps the category-specific payload a step was built with', () => {
    const step = new Step({
      graph: { nodes: ['A', 'B'], visited: ['A'] },
      ds: 'stack',
      data: { values: [1, 2] },
      tree: { value: 10, left: null, right: null },
      msg: 'Visited A',
    });

    expect(step.graph).toEqual({ nodes: ['A', 'B'], visited: ['A'] });
    expect(step.ds).toBe('stack');
    expect(step.data).toEqual({ values: [1, 2] });
    expect(step.tree).toEqual({ value: 10, left: null, right: null });
  });
});
