import { Algorithm } from '../../../domain/algorithms/Algorithm';
import { complexity as allComplexity, explanations, algoNames, codeSnippets } from '../../../data/algorithmData';

export class TreeAlgorithm extends Algorithm {
  constructor(id) {
    super();
    this._id = id;
    this._complexity = allComplexity[id];
    this._explanation = explanations[id];
    this._name = algoNames[id];
    this._snippets = codeSnippets[id];
  }

  get id() { return this._id; }
  get name() { return this._name; }
  get category() { return 'trees'; }
  get complexity() { return this._complexity; }
  get codeSnippets() { return this._snippets; }
  get explanation() { return this._explanation; }

  getDefaultInput() {
    return [30, 20, 40, 10, 25, 35, 50];
  }
}

// Shared adapter: replay one insertion per value through an existing tree
// engine (BST/AVL) and record a snapshot after each change, so comparison
// panels can render the real structure at every playback tick. Heights and
// counts are derived from the snapshot so both engines use one convention
// (BST reports edge-height, AVL nodes report level-height internally).
function snapshotHeight(node) {
  return node ? 1 + Math.max(snapshotHeight(node.left), snapshotHeight(node.right)) : -1;
}

function snapshotCount(node) {
  return node ? 1 + snapshotCount(node.left) + snapshotCount(node.right) : 0;
}

export function buildInsertSteps(engine, values, describe) {
  return values.map((value, index) => {
    const duplicate = Boolean(engine.search(value));
    if (!duplicate) engine.insert(value);
    const tree = engine.snapshot();
    const height = snapshotHeight(tree);
    const nodeCount = snapshotCount(tree);
    const insertMeta = duplicate
      ? {
          msg: `Insert ${value}: duplicate ignored — the tree is unchanged (height ${height}).`,
          msgKey: 'steps:tree.insertDuplicate',
          msgParams: { v: value, height },
        }
      : describe(value, height, nodeCount);
    return {
      arr: values.slice(0, index + 1),
      tree,
      inserted: value,
      height,
      nodeCount,
      inOrder: engine.getInOrder(),
      msg: insertMeta.msg,
      msgKey: insertMeta.msgKey,
      msgParams: insertMeta.msgParams,
      codeLine: 1,
      codeLines: { js: 1, python: 1, cpp: 1, java: 1, csharp: 1 },
    };
  });
}
