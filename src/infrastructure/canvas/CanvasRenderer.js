import { createSortingVisualizer } from '../../algorithms/sorting/sortingVisualizer';
import { createSearchingVisualizer } from '../../algorithms/searching/searchingVisualizer';

export class CanvasRenderer {
  constructor(canvasEl, category = 'sorting') {
    this.canvas = canvasEl;
    this.visualizer = category === 'searching' ? createSearchingVisualizer() : createSortingVisualizer();
    this.visualizer.init(canvasEl);
  }

  draw(steps, stepIdx, algo, input = [], target = null) {
    const arr = Array.isArray(steps) ? steps : [steps];
    this.visualizer.setState({ steps: arr, algo, array: input, arr: input, target });
    this.visualizer.drawStep(stepIdx ?? 0);
  }

  drawStep(step) {
    this.draw([step], 0, 'custom');
  }

  animateStep(stepIdx, callback) {
    this.visualizer.animateStep(stepIdx, callback);
  }

  destroy() {
    this.visualizer.stopAnimation();
  }
}
