import { TreeAlgorithm, buildInsertSteps } from './TreeAlgorithm';
import { AVLTree as AVLEngine } from '../../../algorithms/trees/AVLTree.js';

export class AVLTree extends TreeAlgorithm {
  constructor() {
    super('avl');
  }

  generateSteps(input) {
    const engine = new AVLEngine();
    return buildInsertSteps(engine, [...input], (value, height, nodeCount) =>
      `Insert ${value}: AVL rebalances when needed, height ${height} with ${nodeCount} node${nodeCount === 1 ? '' : 's'}.`);
  }
}
