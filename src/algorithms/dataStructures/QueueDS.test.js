import { describe, it, expect } from 'vitest';
import { QueueDS } from './QueueDS.js';

/** The values currently in the queue, front first. */
const valuesOf = (queue) =>
  queue.nodes.filter((node) => !node.isDeleted).map((node) => node.val);

describe('QueueDS', () => {
  it('starts empty', () => {
    const queue = new QueueDS();

    expect(queue.getSize()).toBe(0);
    expect(valuesOf(queue)).toEqual([]);
  });

  it('appends values at the back', () => {
    const queue = new QueueDS();

    queue.enqueue(1);
    queue.enqueue(2);

    expect(queue.getSize()).toBe(2);
    expect(valuesOf(queue)).toEqual([1, 2]);
  });

  it('removes the first value first (FIFO)', () => {
    const queue = new QueueDS();

    queue.enqueue(1);
    queue.enqueue(2);
    queue.enqueue(3);

    expect(queue.dequeue()).toBe(1);
    expect(queue.dequeue()).toBe(2);
    expect(queue.getSize()).toBe(1);
    expect(valuesOf(queue)).toEqual([3]);
  });

  it('reports nothing when dequeuing an empty queue', () => {
    const queue = new QueueDS();

    expect(queue.dequeue()).toBe('');
    expect(queue.getSize()).toBe(0);
  });

  it('clears every value', () => {
    const queue = new QueueDS();

    queue.enqueue(1);
    queue.enqueue(2);
    queue.clear();

    expect(queue.getSize()).toBe(0);
    expect(valuesOf(queue)).toEqual([]);
  });
});
