// src/algorithms/trees/AVLTree.js
/**
 * AVLTree implementation extending the abstract TreeBase.
 * Provides self‑balancing binary search tree functionality for the visualizer.
 */
import { TreeBase } from "./TreeBase.js";
import { AVLNode } from "./AVLNode.js";
// --- Visualizer configuration (added) ---
export const THEMES = {
  light: {
    background: "#f4f8fc", bg: "#f4f8fc", nodeFill: "#1769aa",
    nodeStroke: "#ffffff", nodeText: "#ffffff", accent: "#1769aa",
    accent2: "#d8a52b", success: "#16876b", danger: "#d85b68",
  },
  night: {
    background: "#0e1825", bg: "#0e1825", nodeFill: "#70b7f0",
    nodeStroke: "#152437", nodeText: "#0e1825", accent: "#70b7f0",
    accent2: "#ecc365", success: "#5bd0aa", danger: "#ff8490",
  },
};
THEMES.dark = THEMES.night;

// Speed table: 0=slow,1=normal,2=fast (ms per step)
export const SPEED_TABLE = [400, 200, 80];

export function drawTree(ctx, root, initialDepth = 0, searchPath = [], theme = THEMES.light) {
  if (!root) return;

  const width = ctx.canvas.clientWidth || ctx.canvas.width;
  const nodes = [];
  const edges = [];
  const place = (node, x, y, depth) => {
    if (!node) return;
    const value = node.value ?? node.data;
    node.cur_x = x;
    node.cur_y = y;
    nodes.push({ node, value, x, y });
    const offset = Math.max(30, width / 2 ** (depth + 2));
    if (node.left) {
      const child = { node: node.left, x: x - offset, y: y + 78, depth: depth + 1 };
      edges.push({ x1: x, y1: y, x2: child.x, y2: child.y });
      place(child.node, child.x, child.y, child.depth);
    }
    if (node.right) {
      const child = { node: node.right, x: x + offset, y: y + 78, depth: depth + 1 };
      edges.push({ x1: x, y1: y, x2: child.x, y2: child.y });
      place(child.node, child.x, child.y, child.depth);
    }
  };

  place(root, 0, 0, initialDepth);
  ctx.lineWidth = 2;
  ctx.strokeStyle = theme.nodeStroke;
  edges.forEach(({ x1, y1, x2, y2 }) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1 + 18);
    ctx.lineTo(x2, y2 - 18);
    ctx.stroke();
  });

  nodes.forEach(({ node, value, x, y }) => {
    const fill = node.highlightColor
      || (searchPath.includes(value) ? theme.accent2 : node.color === 'red' ? '#d94f59' : node.color === 'black' ? '#30465c' : theme.nodeFill);
    ctx.fillStyle = fill;
    ctx.strokeStyle = theme.nodeStroke;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = node.color === 'red' || node.color === 'black' ? '#ffffff' : theme.nodeText;
    ctx.font = '700 12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(value), x, y);
  });
}

// --- End of added config ---


export class AVLTree extends TreeBase {
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
    if (!node) return new AVLNode(value);
    if (value < node.value) node.left = this._insertRec(node.left, value);
    else if (value > node.value) node.right = this._insertRec(node.right, value);
    // duplicate values are ignored
    else return node;
    return this._rebalance(node);
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
      // node with one or no child
      if (!node.left) return node.right;
      if (!node.right) return node.left;
      // node with two children: get inorder successor
      const succ = this._minValueNode(node.right);
      node.value = succ.value;
      node.right = this._deleteRec(node.right, succ.value);
    }
    return this._rebalance(node);
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

  // ----- Balancing helpers -----
  _height(node) {
    return node ? node.height : -1;
  }

  _updateHeight(node) {
    node.height = Math.max(this._height(node.left), this._height(node.right)) + 1;
  }

  _balanceFactor(node) {
    return this._height(node.left) - this._height(node.right);
  }

  _rebalance(node) {
    this._updateHeight(node);
    const bf = this._balanceFactor(node);
    if (bf > 1) {
      if (this._balanceFactor(node.left) < 0) node.left = this._rotateLeft(node.left);
      return this._rotateRight(node);
    }
    if (bf < -1) {
      if (this._balanceFactor(node.right) > 0) node.right = this._rotateRight(node.right);
      return this._rotateLeft(node);
    }
    return node;
  }

  _rotateLeft(z) {
    const y = z.right;
    const T2 = y.left;
    y.left = z;
    z.right = T2;
    this._updateHeight(z);
    this._updateHeight(y);
    return y;
  }

  _rotateRight(z) {
    const y = z.left;
    const T3 = y.right;
    y.right = z;
    z.left = T3;
    this._updateHeight(z);
    this._updateHeight(y);
    return y;
  }

  // ----- Traversal utilities (used by UI) -----
  getPreOrder() {
    const res = [];
    const walk = (n) => {
      if (!n) return;
      res.push(n.value);
      walk(n.left);
      walk(n.right);
    };
    walk(this.root);
    return res;
  }

  getInOrder() {
    const res = [];
    const walk = (n) => {
      if (!n) return;
      walk(n.left);
      res.push(n.value);
      walk(n.right);
    };
    walk(this.root);
    return res;
  }

  getPostOrder() {
    const res = [];
    const walk = (n) => {
      if (!n) return;
      walk(n.left);
      walk(n.right);
      res.push(n.value);
    };
    walk(this.root);
    return res;
  }

  getBreadthFirst() {
    const res = [];
    const q = [];
    if (this.root) q.push(this.root);
    while (q.length) {
      const n = q.shift();
      res.push(n.value);
      if (n.left) q.push(n.left);
      if (n.right) q.push(n.right);
    }
    return res;
  }

  // ----- UI helper overrides -----
  getHTMLControls() {
    return `
      <div class="tree-controls">
        <input type="number" id="avl-insert" placeholder="Insert value" />
        <button onclick="window.avlInsertHandler && window.avlInsertHandler()">Insert</button>
        <input type="number" id="avl-delete" placeholder="Delete value" />
        <button onclick="window.avlDeleteHandler && window.avlDeleteHandler()">Delete</button>
      </div>
    `;
  }

  getSize() {
    return this.nodeCount;
  }

  getTreeHeight() {
    return this._height(this.root);
  }
}
