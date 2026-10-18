// src/algorithms/trees/RedBlackNode.js
'use strict';

/**
 * Node used by Red‑Black Tree visualizer.
 * Extends the basic fields from AVLNode but adds a `color` property
 * ('red' | 'black'). The visualizer will draw red nodes in '#ff4136'
 * and black nodes in '#2d2d2d' (adjustable via themes).
 */
export class RedBlackNode {
  constructor(data) {
    this.data = data;
    this.left = null;
    this.right = null;
    this.parent = null;
    this.color = 'red'; // newly inserted nodes start red
    // layout helpers used by the draw routine
    this.cur_x = 0; this.cur_y = 0;
    this.tgt_x = 0; this.tgt_y = 0;
    this.isNew = false; this.isRotating = false;
    this.alpha = 0; this.pulseTimer = 0; this.highlightVal = 0;
    this.prelim = 0; this.mod = 0;
    this.highlightColor = null; this.highlightDuration = 0;
  }

  get value() { return this.data; }
  set value(value) { this.data = value; }
}
