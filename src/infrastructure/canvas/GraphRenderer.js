import { GraphCanvasRenderer } from './GraphCanvasRenderer';

// Adapter matching CanvasRenderer's API so comparison panels can own one graph
// renderer per side and redraw the same step on resize/theme changes.
export class GraphRenderer {
  constructor(canvasEl) {
    this.renderer = new GraphCanvasRenderer(canvasEl);
  }

  resize() {
    this.renderer.resize();
  }

  draw(steps, stepIdx, algo, input) {
    const step = Array.isArray(steps) ? steps[Math.max(0, stepIdx)] : steps;
    this.renderer.draw(step || { graph: input });
  }

  destroy() {
    this.renderer.destroy();
  }
}
