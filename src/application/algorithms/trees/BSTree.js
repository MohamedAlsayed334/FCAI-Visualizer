import { TreeAlgorithm, buildInsertSteps } from './TreeAlgorithm';
import { BST } from '../../../algorithms/trees/BST.js';

export class BSTree extends TreeAlgorithm {
  constructor() {
    super('bst');
  }

  generateSteps(input) {
    const engine = new BST();
    return buildInsertSteps(engine, [...input], (value, height, nodeCount) => ({
      msg: `Insert ${value}: plain BST keeps the insertion order, height ${height} with ${nodeCount} node${nodeCount === 1 ? '' : 's'}.`,
      msgKey: 'steps:tree.insertBst',
      msgParams: { v: value, height, count: nodeCount },
    }));
  }
}
