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
    edgeCol: "#8291af", nodeShadow: "rgba(0,0,0,0.18)", textDim: "#78829b",
  },
  night: {
    background: "#0e1825", bg: "#0e1825", nodeFill: "#70b7f0",
    nodeStroke: "#152437", nodeText: "#0e1825", accent: "#70b7f0",
    accent2: "#ecc365", success: "#5bd0aa", danger: "#ff8490",
    edgeCol: "#485478", nodeShadow: "rgba(0,0,0,0.45)", textDim: "#697698",
  },
};
THEMES.dark = THEMES.night;

// Speed table: 0=slow,1=normal,2=fast (ms per step)
export const SPEED_TABLE = [400, 200, 80];

/**
 * Blend a hex or rgb(a) color string with an alpha transparency value.
 * @param {string} hex - Hex (#RRGGBB) or rgb/rgba string
 * @param {number} alpha - Alpha transparency value (0.0 to 1.0)
 * @returns {string} rgba(...) CSS color string
 */
export function colA(hex, alpha = 1) {
  if (!hex) return `rgba(0,0,0,${Number(alpha).toFixed(3)})`;
  if (hex.startsWith('rgba') || hex.startsWith('rgb')) {
    const parts = hex.match(/[\d.]+/g).map(Number);
    return `rgba(${parts[0]},${parts[1]},${parts[2]},${Number(alpha).toFixed(3)})`;
  }
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16) || 0;
  const g = parseInt(clean.slice(2, 4), 16) || 0;
  const b = parseInt(clean.slice(4, 6), 16) || 0;
  return `rgba(${r},${g},${b},${Number(alpha).toFixed(3)})`;
}

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
  insert(value, recorder = null) {
    this._emit(recorder, {
      operation: `Insert ${value}`,
      explanation: `Start inserting ${value} into the AVL Tree. Follow BST order, then restore balance if needed.`,
      involved: [value],
      roles: { target: value },
    });

    if (!this.root) {
      this.root = new AVLNode(value);
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

    const path = [];
    let curr = this.root;
    while (curr) {
      path.push(curr);
      if (value === curr.value) {
        this._emit(recorder, {
          operation: `Duplicate key ${value}`,
          explanation: `Node ${value} already exists in the AVL tree. Duplicates are ignored.`,
          involved: [value],
          roles: { current: curr.value },
          property: 'all',
        });
        return;
      }
      const isLeft = value < curr.value;
      this._emit(recorder, {
        operation: `Compare with ${curr.value}`,
        explanation: `${value} is ${isLeft ? 'less' : 'greater'} than ${curr.value}, continue ${isLeft ? 'left' : 'right'}.`,
        involved: [value, curr.value],
        roles: { current: curr.value, target: value },
      });
      curr = isLeft ? curr.left : curr.right;
    }

    const parent = path[path.length - 1];
    const newNode = new AVLNode(value);
    if (value < parent.value) {
      parent.left = newNode;
    } else {
      parent.right = newNode;
    }
    this.nodeCount++;

    this._emit(recorder, {
      operation: `Attach ${value}`,
      explanation: `Attached ${value} as ${value < parent.value ? 'left' : 'right'} child of ${parent.value}.`,
      involved: [value, parent.value],
      roles: { parent: parent.value, current: value },
    });

    // Backtrack and rebalance
    for (let i = path.length - 1; i >= 0; i--) {
      const z = path[i];
      const p = i > 0 ? path[i - 1] : null;
      this._updateHeight(z);
      const bf = this._balanceFactor(z);

      if (Math.abs(bf) <= 1) {
        this._emit(recorder, {
          operation: `Check balance at ${z.value}`,
          explanation: `Node ${z.value} is balanced (balance factor = ${bf}).`,
          involved: [z.value],
          roles: { current: z.value },
          property: 'all',
        });
      } else {
        let newSubtreeRoot;
        if (bf > 1) {
          if (this._balanceFactor(z.left) >= 0) {
            this._emit(recorder, {
              operation: `LL Imbalance at ${z.value}`,
              explanation: `Left subtree of ${z.value} is heavy (bf = ${bf}) and left child ${z.left.value} is left-heavy. Perform Right Rotation.`,
              involved: [z.value, z.left.value],
              roles: { current: z.value, parent: z.left.value },
              property: 1,
            });
            newSubtreeRoot = this._rotateRight(z);
            this._emit(recorder, {
              operation: `Rotated Right around ${z.value}`,
              explanation: `Right rotation complete. ${newSubtreeRoot.value} is now the root of this subtree.`,
              involved: [z.value, newSubtreeRoot.value],
              roles: { current: newSubtreeRoot.value },
              property: 'all',
            });
          } else {
            this._emit(recorder, {
              operation: `LR Imbalance at ${z.value}`,
              explanation: `Left-Right imbalance at ${z.value} (bf = ${bf}). Step 1: Rotate Left around child ${z.left.value}, then Step 2: Rotate Right around ${z.value}.`,
              involved: [z.value, z.left.value],
              roles: { current: z.value, parent: z.left.value },
              property: 1,
            });
            const oldLeft = z.left;
            z.left = this._rotateLeft(z.left);
            this._emit(recorder, {
              operation: `Step 1: Rotated Left on ${oldLeft.value}`,
              explanation: `Left rotation on ${oldLeft.value} complete. Imbalance converted to LL case.`,
              involved: [z.value, z.left.value],
              roles: { current: z.value },
              property: 1,
            });
            newSubtreeRoot = this._rotateRight(z);
            this._emit(recorder, {
              operation: `Step 2: Rotated Right on ${z.value}`,
              explanation: `Right rotation complete. Double rotation (LR) resolved the imbalance.`,
              involved: [z.value, newSubtreeRoot.value],
              roles: { current: newSubtreeRoot.value },
              property: 'all',
            });
          }
        } else {
          if (this._balanceFactor(z.right) <= 0) {
            this._emit(recorder, {
              operation: `RR Imbalance at ${z.value}`,
              explanation: `Right subtree of ${z.value} is heavy (bf = ${bf}) and right child ${z.right.value} is right-heavy. Perform Left Rotation.`,
              involved: [z.value, z.right.value],
              roles: { current: z.value, parent: z.right.value },
              property: 1,
            });
            newSubtreeRoot = this._rotateLeft(z);
            this._emit(recorder, {
              operation: `Rotated Left around ${z.value}`,
              explanation: `Left rotation complete. ${newSubtreeRoot.value} is now the root of this subtree.`,
              involved: [z.value, newSubtreeRoot.value],
              roles: { current: newSubtreeRoot.value },
              property: 'all',
            });
          } else {
            this._emit(recorder, {
              operation: `RL Imbalance at ${z.value}`,
              explanation: `Right-Left imbalance at ${z.value} (bf = ${bf}). Step 1: Rotate Right around child ${z.right.value}, then Step 2: Rotate Left around ${z.value}.`,
              involved: [z.value, z.right.value],
              roles: { current: z.value, parent: z.right.value },
              property: 1,
            });
            const oldRight = z.right;
            z.right = this._rotateRight(z.right);
            this._emit(recorder, {
              operation: `Step 1: Rotated Right on ${oldRight.value}`,
              explanation: `Right rotation on ${oldRight.value} complete. Imbalance converted to RR case.`,
              involved: [z.value, z.right.value],
              roles: { current: z.value },
              property: 1,
            });
            newSubtreeRoot = this._rotateLeft(z);
            this._emit(recorder, {
              operation: `Step 2: Rotated Left on ${z.value}`,
              explanation: `Left rotation complete. Double rotation (RL) resolved the imbalance.`,
              involved: [z.value, newSubtreeRoot.value],
              roles: { current: newSubtreeRoot.value },
              property: 'all',
            });
          }
        }

        if (!p) {
          this.root = newSubtreeRoot;
        } else if (p.left === z) {
          p.left = newSubtreeRoot;
        } else {
          p.right = newSubtreeRoot;
        }

        path[i] = newSubtreeRoot;
      }
    }

    this._emit(recorder, {
      operation: `Insert ${value} complete`,
      explanation: `AVL Tree balance property is satisfied for all nodes.`,
      involved: [value],
      property: 'all',
    });
  }

  delete(value, recorder = null) {
    this._emit(recorder, {
      operation: `Delete ${value}`,
      explanation: `Search for node ${value} to delete from the AVL Tree.`,
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

    const path = [];
    let curr = this.root;
    while (curr && curr.value !== value) {
      path.push(curr);
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
        explanation: `Node ${value} does not exist in the AVL tree. Nothing deleted.`,
        involved: [value],
        property: 'all',
      });
      return;
    }

    const parent = path.length > 0 ? path[path.length - 1] : null;

    this._emit(recorder, {
      operation: `Found node ${value}`,
      explanation: `Located node ${value}. Determine deletion case and rebalance ancestors.`,
      involved: [value],
      roles: { target: value, parent: parent ? parent.value : null },
    });

    // Case 1: Leaf
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
        explanation: `Node ${value} is a leaf node. Removed it directly.`,
        involved: [value],
        roles: { parent: parent ? parent.value : null },
      });
    }
    // Case 2: One child
    else if (!curr.left || !curr.right) {
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
        explanation: `Node ${value} has one child (${child.value}). Linked parent directly to child.`,
        involved: [value, child.value],
        roles: { successor: child.value, parent: parent ? parent.value : null },
      });
    }
    // Case 3: Two children
    else {
      path.push(curr);
      let succParent = curr;
      let succ = curr.right;
      this._emit(recorder, {
        operation: `Find successor of ${value}`,
        explanation: `Node ${value} has two children. Find in-order successor in right subtree.`,
        involved: [value, succ.value],
        roles: { target: value, current: succ.value },
      });

      const succPath = [];
      while (succ.left) {
        succPath.push(succ);
        succParent = succ;
        succ = succ.left;
        this._emit(recorder, {
          operation: `Move left to ${succ.value}`,
          explanation: `Continue left in right subtree to find minimum value.`,
          involved: [succ.value],
          roles: { target: value, current: succ.value },
        });
      }

      this._emit(recorder, {
        operation: `Found successor ${succ.value}`,
        explanation: `In-order successor is ${succ.value}. Replace value ${value} with ${succ.value} and remove successor node.`,
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

      path.push(...succPath);

      this._emit(recorder, {
        operation: `Replaced with ${succVal}`,
        explanation: `Node value replaced with ${succVal}. Now verify balance factors along ancestor path.`,
        involved: [succVal],
        roles: { current: curr.value },
      });
    }

    // Now rebalance ancestors in path
    for (let i = path.length - 1; i >= 0; i--) {
      const z = path[i];
      const p = i > 0 ? path[i - 1] : null;
      this._updateHeight(z);
      const bf = this._balanceFactor(z);

      if (Math.abs(bf) <= 1) {
        this._emit(recorder, {
          operation: `Check balance at ${z.value}`,
          explanation: `Node ${z.value} is balanced (balance factor = ${bf}).`,
          involved: [z.value],
          roles: { current: z.value },
          property: 'all',
        });
      } else {
        let newSubtreeRoot;
        if (bf > 1) {
          if (this._balanceFactor(z.left) >= 0) {
            this._emit(recorder, {
              operation: `LL Imbalance at ${z.value}`,
              explanation: `Imbalance after deletion at ${z.value} (bf = ${bf}). Perform Right Rotation.`,
              involved: [z.value, z.left.value],
              roles: { current: z.value, parent: z.left.value },
              property: 1,
            });
            newSubtreeRoot = this._rotateRight(z);
          } else {
            this._emit(recorder, {
              operation: `LR Imbalance at ${z.value}`,
              explanation: `Double rotation needed after deletion at ${z.value}. Left rotate child ${z.left.value}, then Right rotate ${z.value}.`,
              involved: [z.value, z.left.value],
              roles: { current: z.value, parent: z.left.value },
              property: 1,
            });
            z.left = this._rotateLeft(z.left);
            newSubtreeRoot = this._rotateRight(z);
          }
        } else {
          if (this._balanceFactor(z.right) <= 0) {
            this._emit(recorder, {
              operation: `RR Imbalance at ${z.value}`,
              explanation: `Imbalance after deletion at ${z.value} (bf = ${bf}). Perform Left Rotation.`,
              involved: [z.value, z.right.value],
              roles: { current: z.value, parent: z.right.value },
              property: 1,
            });
            newSubtreeRoot = this._rotateLeft(z);
          } else {
            this._emit(recorder, {
              operation: `RL Imbalance at ${z.value}`,
              explanation: `Double rotation needed after deletion at ${z.value}. Right rotate child ${z.right.value}, then Left rotate ${z.value}.`,
              involved: [z.value, z.right.value],
              roles: { current: z.value, parent: z.right.value },
              property: 1,
            });
            z.right = this._rotateRight(z.right);
            newSubtreeRoot = this._rotateLeft(z);
          }
        }

        if (!p) {
          this.root = newSubtreeRoot;
        } else if (p.left === z) {
          p.left = newSubtreeRoot;
        } else {
          p.right = newSubtreeRoot;
        }

        path[i] = newSubtreeRoot;

        this._emit(recorder, {
          operation: `Rebalanced at ${newSubtreeRoot.value}`,
          explanation: `Rotation complete. Subtree root is now ${newSubtreeRoot.value}.`,
          involved: [newSubtreeRoot.value],
          roles: { current: newSubtreeRoot.value },
          property: 'all',
        });
      }
    }

    this._emit(recorder, {
      operation: `Delete ${value} complete`,
      explanation: `Node ${value} deleted and all ancestor nodes are balanced.`,
      involved: [],
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
