import { describe, it, expect } from 'vitest';
import { BST } from './BST.js';

describe('BST', () => {
  it('starts empty', () => {
    const tree = new BST();

    expect(tree.root).toBeNull();
    expect(tree.getNodeCount()).toBe(0);
    expect(tree.getInOrder()).toEqual([]);
  });

  it('inserts values and keeps them sorted in order', () => {
    const tree = new BST();

    [50, 30, 70, 20, 40, 60, 80].forEach((value) => tree.insert(value));

    expect(tree.getNodeCount()).toBe(7);
    expect(tree.getInOrder()).toEqual([20, 30, 40, 50, 60, 70, 80]);
    expect(tree.getPreOrder()).toEqual([50, 30, 20, 40, 70, 60, 80]);
  });

  it('keeps the binary search tree ordering property', () => {
    const tree = new BST();

    [50, 30, 70, 20, 40, 60, 80, 35].forEach((value) => tree.insert(value));

    const checkOrdering = (node, min, max) => {
      if (!node) return;
      expect(node.value).toBeGreaterThan(min);
      expect(node.value).toBeLessThan(max);
      checkOrdering(node.left, min, node.value);
      checkOrdering(node.right, node.value, max);
    };

    checkOrdering(tree.root, -Infinity, Infinity);
  });

  it('ignores duplicate values', () => {
    const tree = new BST();

    tree.insert(10);
    tree.insert(10);

    expect(tree.getNodeCount()).toBe(1);
    expect(tree.getInOrder()).toEqual([10]);
  });

  it('finds a stored value and rejects an unknown one', () => {
    const tree = new BST();

    [50, 30, 70].forEach((value) => tree.insert(value));

    expect(tree.search(30)?.value).toBe(30);
    expect(tree.search(999)).toBeNull();
  });

  it('deletes a leaf', () => {
    const tree = new BST();

    [50, 30, 70].forEach((value) => tree.insert(value));
    tree.delete(30);

    expect(tree.getNodeCount()).toBe(2);
    expect(tree.getInOrder()).toEqual([50, 70]);
  });

  it('deletes a node with one child', () => {
    const tree = new BST();

    [50, 30, 70, 20].forEach((value) => tree.insert(value));
    tree.delete(30);

    expect(tree.getNodeCount()).toBe(3);
    expect(tree.getInOrder()).toEqual([20, 50, 70]);
  });

  it('deletes a node with two children by promoting its successor', () => {
    const tree = new BST();

    [50, 30, 70, 20, 40, 60, 80].forEach((value) => tree.insert(value));
    tree.delete(50);

    expect(tree.getNodeCount()).toBe(6);
    expect(tree.getInOrder()).toEqual([20, 30, 40, 60, 70, 80]);
  });

  it('empties the tree when the only node is deleted', () => {
    const tree = new BST();

    tree.insert(10);
    tree.delete(10);

    expect(tree.root).toBeNull();
    expect(tree.getNodeCount()).toBe(0);
  });

  it('does nothing when deleting a value that is not there', () => {
    const tree = new BST();

    [50, 30].forEach((value) => tree.insert(value));
    tree.delete(999);

    expect(tree.getNodeCount()).toBe(2);
    expect(tree.getInOrder()).toEqual([30, 50]);
  });

  it('reports what it did through the event recorder', () => {
    const tree = new BST();
    const events = [];

    tree.insert(10, (event) => events.push(event));

    expect(events.length).toBeGreaterThan(0);
    expect(events[0].operation).toContain('Insert 10');
    expect(events.at(-1).snapshot.value).toBe(10);
  });
});
