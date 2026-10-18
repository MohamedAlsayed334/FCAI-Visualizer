// src/algorithms/trees/RedBlackTree.js
/**
 * Red‑Black Tree implementation extending TreeBase.
 * Provides insertion with proper recoloring and rotations.
 * Deletion is implemented in a simplified manner (BST delete) –
 * full R‑B delete fix‑up can be added later.
 */
import { TreeBase } from "./TreeBase.js";
import { RedBlackNode } from "./RedBlackNode.js";

export class RedBlackTree extends TreeBase {
  constructor() {
    super();
    this.nodeCount = 0;
    this.isRedBlack = true;
  }

  // ---------- Core operations ----------
  insert(value) {
    const newNode = new RedBlackNode(value);
    // Standard BST insert, keeping parent links
    if (!this.root) {
      this.root = newNode;
    } else {
      let cur = this.root;
      while (true) {
        if (value < cur.data) {
          if (!cur.left) { cur.left = newNode; newNode.parent = cur; break; }
          cur = cur.left;
        } else if (value > cur.data) {
          if (!cur.right) { cur.right = newNode; newNode.parent = cur; break; }
          cur = cur.right;
        } else {
          // duplicate – ignore
          return;
        }
      }
    }
    this.nodeCount++;
    this._insertFixup(newNode);
  }

  _insertFixup(z) {
    // While parent is red, we need to recolor/rotate
    while (z.parent && z.parent.color === 'red') {
      const gp = z.parent.parent; // grandparent (must exist)
      if (!gp) break; // safety
      if (z.parent === gp.left) {
        const y = gp.right; // uncle
        if (y && y.color === 'red') {
          // Case 1: recolor
          z.parent.color = 'black';
          y.color = 'black';
          gp.color = 'red';
          z = gp;
        } else {
          if (z === z.parent.right) {
            // Case 2: left‑rotate parent
            z = z.parent;
            this._rotateLeft(z);
          }
          // Case 3: right‑rotate grandparent
          z.parent.color = 'black';
          gp.color = 'red';
          this._rotateRight(gp);
        }
      } else {
        // mirror of above (parent is right child)
        const y = gp.left;
        if (y && y.color === 'red') {
          z.parent.color = 'black';
          y.color = 'black';
          gp.color = 'red';
          z = gp;
        } else {
          if (z === z.parent.left) {
            z = z.parent;
            this._rotateRight(z);
          }
          z.parent.color = 'black';
          gp.color = 'red';
          this._rotateLeft(gp);
        }
      }
    }
    this.root.color = 'black'; // root is always black
  }

  // ---------- Rotations (keep parent links) ----------
  _rotateLeft(x) {
    const y = x.right;
    if (!y) return;
    x.right = y.left;
    if (y.left) y.left.parent = x;
    y.parent = x.parent;
    if (!x.parent) this.root = y;
    else if (x === x.parent.left) x.parent.left = y;
    else x.parent.right = y;
    y.left = x;
    x.parent = y;
  }

  _rotateRight(y) {
    const x = y.left;
    if (!x) return;
    y.left = x.right;
    if (x.right) x.right.parent = y;
    x.parent = y.parent;
    if (!y.parent) this.root = x;
    else if (y === y.parent.left) y.parent.left = x;
    else y.parent.right = x;
    x.right = y;
    y.parent = x;
  }

  // ---------- Search ----------
  search(value) {
    let cur = this.root;
    while (cur) {
      if (value === cur.data) return cur;
      cur = value < cur.data ? cur.left : cur.right;
    }
    return null;
  }

  // ---------- Deletion (simplified BST delete) ----------
  delete(value) {
    if (!this.search(value)) return;
    this.root = this._deleteRec(this.root, value);
    this.nodeCount--;
    // Ensure root stays black
    if (this.root) this.root.color = 'black';
  }

  _transplant(u, v) {
    if (!u.parent) this.root = v;
    else if (u === u.parent.left) u.parent.left = v;
    else u.parent.right = v;
    if (v) v.parent = u.parent;
  }

  _minimum(node) {
    while (node.left) node = node.left;
    return node;
  }

  _deleteRec(node, value) {
    if (!node) return null;
    if (value < node.data) {
      node.left = this._deleteRec(node.left, value);
    } else if (value > node.data) {
      node.right = this._deleteRec(node.right, value);
    } else {
      // node to delete found
      if (!node.left) {
        const r = node.right;
        if (r) r.parent = node.parent;
        return r;
      } else if (!node.right) {
        const l = node.left;
        if (l) l.parent = node.parent;
        return l;
      } else {
        const succ = this._minimum(node.right);
        node.data = succ.data;
        node.right = this._deleteRec(node.right, succ.data);
        if (node.right) node.right.parent = node;
      }
    }
    return node;
  }

  // ---------- Traversal utilities (inherited from TreeBase) ----------
  // The TreeBase already provides getPreOrder / getInOrder etc.

  // ---------- UI helpers ----------
  getHTMLControls() {
    return `
      <div class="tree-controls">
        <input type="number" id="rb-insert" placeholder="Insert value" />
        <button onclick="window.rbInsertHandler && window.rbInsertHandler()">Insert</button>
        <input type="number" id="rb-delete" placeholder="Delete value" />
        <button onclick="window.rbDeleteHandler && window.rbDeleteHandler()">Delete</button>
      </div>
    `;
  }

  getSize() { return this.nodeCount; }

  getTreeHeight() { return this._height(this.root); }
}
