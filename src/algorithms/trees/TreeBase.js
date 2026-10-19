// src/algorithms/trees/TreeBase.js
/**
 * Abstract base class for tree visualizers.
 * Defines the common public API used by the UI.
 */
export class TreeBase {
  constructor() {
    if (new.target === TreeBase) {
      throw new TypeError('TreeBase is abstract and cannot be instantiated directly');
    }
    this.root = null;
  }

  // Core operations – to be implemented by subclasses
  insert() { throw new Error('insert not implemented'); }
  delete() { throw new Error('delete not implemented'); }
  search() { throw new Error('search not implemented'); }

  // ----- Core helpers (private) -----
  _countRec(node) { return node ? 1 + this._countRec(node.left) + this._countRec(node.right) : 0; }
  _height(node) { return node ? 1 + Math.max(this._height(node.left), this._height(node.right)) : -1; }
  _nodeValue(node) { return node?.value ?? node?.data; }
  _searchRec(node, value) {
    if (!node) return null;
    const current = this._nodeValue(node);
    if (value === current) return node;
    return this._searchRec(value < current ? node.left : node.right, value);
  }

  _traverse(order) {
    const result = [];
    const walk = (node) => {
      if (!node) return;
      if (order === 'pre') result.push(this._nodeValue(node));
      walk(node.left);
      if (order === 'in') result.push(this._nodeValue(node));
      walk(node.right);
      if (order === 'post') result.push(this._nodeValue(node));
    };
    walk(this.root);
    return result;
  }

  // ----- Public API (used by UI) -----
  getNodeCount() { return this._countRec(this.root); }
  getTreeHeight() { return this._height(this.root); }
  getPreOrder() { return this._traverse('pre'); }
  getInOrder() { return this._traverse('in'); }
  getPostOrder() { return this._traverse('post'); }
  getPreOrderString() { return this.getPreOrder().join(' → '); }
  getInOrderString() { return this.getInOrder().join(' → '); }
  getPostOrderString() { return this.getPostOrder().join(' → '); }
  getBreadthFirst() {
    const values = [];
    const queue = this.root ? [this.root] : [];
    while (queue.length) {
      const node = queue.shift();
      values.push(this._nodeValue(node));
      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }
    return values;
  }
  getBreadthFirstString() { return this.getBreadthFirst().join(' → '); }
  getNodeByData(data) { return this._searchRec(this.root, data); }

  getPredecessor(val) {
    const arr = this.getInOrder();
    const idx = arr.indexOf(val);
    return idx > 0 ? arr[idx - 1] : null;
  }
  getSuccessor(val) {
    const arr = this.getInOrder();
    const idx = arr.indexOf(val);
    return idx >= 0 && idx < arr.length - 1 ? arr[idx + 1] : null;
  }

  insertNode(value) { return this.insert(value); }
  deleteNode(value) { return this.delete(value); }
  clearTree() {
    this.root = null;
    this.nodeCount = 0;
    this.searchPath = [];
    this.clearHighlight();
  }
  buildFromArray(values) {
    this.clearTree();
    values.forEach((value) => this.insertNode(value));
  }
  getInsertionPath(value) {
    const path = [];
    let node = this.root;
    while (node) {
      const current = this._nodeValue(node);
      path.push(current);
      if (value === current) break;
      node = value < current ? node.left : node.right;
    }
    return path;
  }

  // Plain-object copy of the current tree, safe to keep as a playback step.
  _snapshotTree(node = this.root) {
    if (!node) return null;
    return {
      value: this._nodeValue(node),
      color: node.color ?? null,
      left: this._snapshotTree(node.left),
      right: this._snapshotTree(node.right),
    };
  }

  snapshot() {
    return this._snapshotTree(this.root);
  }

  _emit(recorder, event) {
    if (typeof recorder !== 'function') return;
    recorder({
      operation: event.operation,
      explanation: event.explanation,
      involved: event.involved || [],
      roles: event.roles || {},
      property: event.property || null,
      snapshot: this._snapshotTree(),
    });
  }
  getBalanceFactor(value) {
    const node = this.getNodeByData(value);
    if (!node) return 0;
    return this._height(node.left) - this._height(node.right);
  }
  highlightNode(value, color, duration) {
    const node = this.getNodeByData(value);
    if (node) {
      node.highlightColor = color;
      node.highlightDuration = duration;
    }
  }
  clearHighlight() {
    const clear = (node) => {
      if (!node) return;
      node.highlightColor = null;
      node.highlightDuration = 0;
      clear(node.left);
      clear(node.right);
    };
    clear(this.root);
  }
  setSlowMode() { return undefined; }
  tickAnimations() { return undefined; }
}
