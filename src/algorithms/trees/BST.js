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
  insert(value) {
    if (this.search(value)) return;
    this.root = this._insertRec(this.root, value);
    this.nodeCount++;
  }

  _insertRec(node, value) {
    if (!node) return new BSTNode(value);
    if (value < node.value) node.left = this._insertRec(node.left, value);
    else if (value > node.value) node.right = this._insertRec(node.right, value);
    // duplicate values ignored
    return node;
  }

  delete(value) {
    if (!this.search(value)) return;
    this.root = this._deleteRec(this.root, value);
    this.nodeCount--;
  }

  _deleteRec(node, value) {
    if (!node) return null;
    if (value < node.value) node.left = this._deleteRec(node.left, value);
    else if (value > node.value) node.right = this._deleteRec(node.right, value);
    else {
      if (!node.left) return node.right;
      if (!node.right) return node.left;
      // two children: replace with inorder successor
      const succ = this._minValueNode(node.right);
      node.value = succ.value;
      node.right = this._deleteRec(node.right, succ.value);
    }
    return node;
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
