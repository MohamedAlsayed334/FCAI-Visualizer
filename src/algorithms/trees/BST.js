// src/algorithms/trees/BST.js
/**
 * Simple Binary Search Tree implementation extending TreeBase.
 * Does not self‑balance; used for comparison mode and basic visualizations.
 */
import { TreeBase } from "./TreeBase.js";
import { AVLNode as BSTNode } from "./AVLNode.js"; // Reuse node structure (no balancing needed)

export class BST extends TreeBase {
  constructor() {
    super();
    this.nodeCount = 0;
  }

  // ----- Core operations -----
  insert(value, recorder = null) {
    this._emit(recorder, {
      operation: `Insert ${value}`,
      explanation: `Start inserting ${value} into the Binary Search Tree. Follow the BST ordering property.`,
      involved: [value],
      roles: { target: value },
    });

    if (!this.root) {
      this.root = new BSTNode(value);
      this.nodeCount++;
      this._emit(recorder, {
        operation: `Set ${value} as root`,
        explanation: `The tree is empty. Set ${value} as the root node.`,
        involved: [value],
        roles: { current: value },
        property: 'all',
      });
      return;
    }

    let parent = null;
    let curr = this.root;
    while (curr) {
      parent = curr;
      if (value === curr.value) {
        this._emit(recorder, {
          operation: `Duplicate key ${value}`,
          explanation: `Node ${value} already exists in the BST. Duplicate values are ignored.`,
          involved: [value],
          roles: { current: curr.value },
          property: 'all',
        });
        return;
      }
      const isLeft = value < curr.value;
      this._emit(recorder, {
        operation: `Compare with ${curr.value}`,
        explanation: `${value} is ${isLeft ? 'less' : 'greater'} than ${curr.value}, so continue ${isLeft ? 'left' : 'right'}.`,
        involved: [value, curr.value],
        roles: { current: curr.value, target: value },
      });
      curr = isLeft ? curr.left : curr.right;
    }

    const newNode = new BSTNode(value);
    if (value < parent.value) {
      parent.left = newNode;
    } else {
      parent.right = newNode;
    }
    this.nodeCount++;

    this._emit(recorder, {
      operation: `Attach ${value}`,
      explanation: `Attached ${value} as the ${value < parent.value ? 'left' : 'right'} child of ${parent.value}.`,
      involved: [value, parent.value],
      roles: { parent: parent.value, current: value },
      property: 'all',
    });
  }

  delete(value, recorder = null) {
    this._emit(recorder, {
      operation: `Delete ${value}`,
      explanation: `Search for node ${value} to delete from the Binary Search Tree.`,
      involved: [value],
      roles: { target: value },
    });

    if (!this.root) {
      this._emit(recorder, {
        operation: `Tree is empty`,
        explanation: `The tree is empty. Nothing to delete.`,
        involved: [value],
        property: 'all',
      });
      return;
    }

    let parent = null;
    let curr = this.root;
    while (curr && curr.value !== value) {
      parent = curr;
      const isLeft = value < curr.value;
      this._emit(recorder, {
        operation: `Compare with ${curr.value}`,
        explanation: `${value} is ${isLeft ? 'less' : 'greater'} than ${curr.value}, so search ${isLeft ? 'left' : 'right'}.`,
        involved: [value, curr.value],
        roles: { current: curr.value, target: value },
      });
      curr = isLeft ? curr.left : curr.right;
    }

    if (!curr) {
      this._emit(recorder, {
        operation: `Node ${value} not found`,
        explanation: `Node ${value} does not exist in the BST. Nothing to delete.`,
        involved: [value],
        property: 'all',
      });
      return;
    }

    this._emit(recorder, {
      operation: `Found node ${value}`,
      explanation: `Located node ${value}. Determine which deletion case applies (0, 1, or 2 children).`,
      involved: [value],
      roles: { target: value, parent: parent ? parent.value : null },
    });

    // Case 1: Leaf node (0 children)
    if (!curr.left && !curr.right) {
      if (!parent) {
        this.root = null;
      } else if (parent.left === curr) {
        parent.left = null;
      } else {
        parent.right = null;
      }
      this.nodeCount--;
      this._emit(recorder, {
        operation: `Remove leaf ${value}`,
        explanation: `Node ${value} is a leaf node. Removed it directly by setting parent pointer to null.`,
        involved: [value],
        roles: { parent: parent ? parent.value : null },
        property: 'all',
      });
      return;
    }

    // Case 2: One child
    if (!curr.left || !curr.right) {
      const child = curr.left || curr.right;
      if (!parent) {
        this.root = child;
      } else if (parent.left === curr) {
        parent.left = child;
      } else {
        parent.right = child;
      }
      this.nodeCount--;
      this._emit(recorder, {
        operation: `Bypass node ${value}`,
        explanation: `Node ${value} has one child (${child.value}). Linked parent directly to ${child.value}.`,
        involved: [value, child.value],
        roles: { successor: child.value, parent: parent ? parent.value : null },
        property: 'all',
      });
      return;
    }

    // Case 3: Two children
    let succParent = curr;
    let succ = curr.right;
    this._emit(recorder, {
      operation: `Find successor of ${value}`,
      explanation: `Node ${value} has two children. Traverse to the smallest node in the right subtree to find its in-order successor.`,
      involved: [value, succ.value],
      roles: { target: value, current: succ.value },
    });

    while (succ.left) {
      succParent = succ;
      succ = succ.left;
      this._emit(recorder, {
        operation: `Move left to ${succ.value}`,
        explanation: `Continue left in right subtree to find the minimum value.`,
        involved: [succ.value],
        roles: { target: value, current: succ.value },
      });
    }

    this._emit(recorder, {
      operation: `Found successor ${succ.value}`,
      explanation: `In-order successor is ${succ.value}. Copy value ${succ.value} into node ${value}, then remove the successor from its original position.`,
      involved: [value, succ.value],
      roles: { target: value, successor: succ.value },
    });

    const succVal = succ.value;
    if (succParent.left === succ) {
      succParent.left = succ.right;
    } else {
      succParent.right = succ.right;
    }
    curr.value = succVal;
    this.nodeCount--;

    this._emit(recorder, {
      operation: `Replaced with ${succVal}`,
      explanation: `Node value replaced with ${succVal} and successor node spliced out. BST property is restored.`,
      involved: [succVal],
      roles: { current: curr.value },
      property: 'all',
    });
  }

  _minValueNode(node) {
    let cur = node;
    while (cur.left) cur = cur.left;
    return cur;
  }

  search(value) {
    return this._searchRec(this.root, value);
  }

  _searchRec(node, value) {
    if (!node) return null;
    if (value === node.value) return node;
    return value < node.value ? this._searchRec(node.left, value) : this._searchRec(node.right, value);
  }

  // ----- UI helper overrides -----
  getHTMLControls() {
    return `
      <div class="tree-controls">
        <input type="number" id="bst-insert" placeholder="Insert value" />
        <button onclick="window.bstInsertHandler && window.bstInsertHandler()">Insert</button>
        <input type="number" id="bst-delete" placeholder="Delete value" />
        <button onclick="window.bstDeleteHandler && window.bstDeleteHandler()">Delete</button>
      </div>
    `;
  }

  getSize() { return this.nodeCount; }

  getTreeHeight() { return super.getTreeHeight(); }
}
