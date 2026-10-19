import { DataStructureRenderer } from './DataStructureRenderer';

// Adapter matching CanvasRenderer's API for independent comparison panels.
export class DataStructureCanvasRenderer {
  constructor(canvasEl) {
    this.renderer = new DataStructureRenderer(canvasEl);
  }

  resize() {
    this.renderer.resize();
  }

  draw(steps, stepIdx) {
    const step = Array.isArray(steps) ? steps[Math.max(0, stepIdx)] : steps;
    if (step) this.renderer.draw(step);
  }

  destroy() {
    this.renderer.destroy();
  }
}
