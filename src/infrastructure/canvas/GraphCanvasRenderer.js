const THEMES = {
  dark: {
    bg: '#1e1e2e', node: '#313244', nodeBorder: '#585b70',
    visited: '#a6e3a1', current: '#f9e2af', edge: '#585b70',
    mstEdge: '#a6e3a1', text: '#cdd6f4', activeText: '#1e1e2e',
    queue: '#89b4fa', weight: '#cdd6f4', weightBg: '#1e1e2e',
  },
  light: {
    bg: '#f7f8fc', node: '#e3e8f2', nodeBorder: '#aab4c8',
    visited: '#37be73', current: '#ff913c', edge: '#aab4c8',
    mstEdge: '#37be73', text: '#1c2740', activeText: '#1c2740',
    queue: '#3d6fe0', weight: '#1c2740', weightBg: '#f7f8fc',
  },
};

function getTheme() {
  return document.documentElement.getAttribute('data-theme') === 'light'
    ? THEMES.light : THEMES.dark;
}

export class GraphCanvasRenderer {
  constructor(canvasEl) {
    this.canvas = canvasEl;
    this.ctx = canvasEl.getContext('2d');
    this.nodePositions = {};
    this.radius = 24;
    this.step = null;
    this.dpr = window.devicePixelRatio || 1;
    this.resize();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    this.canvas.width = width * this.dpr;
    this.canvas.height = height * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.width = width;
    this.height = height;
    if (this.step) this.draw(this.step);
  }

  _layoutNodes(nodes) {
    const cx = this.width / 2, cy = this.height / 2;
    const radius = Math.min(cx, cy) * 0.6;
    nodes.forEach((n, i) => {
      const angle = (2 * Math.PI * i) / nodes.length - Math.PI / 2;
      this.nodePositions[n] = {
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
      };
    });
  }

  draw(step) {
    this.step = step;
    const { ctx } = this;
    const g = step.graph || step;
    const T = getTheme();
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.fillStyle = T.bg;
    ctx.fillRect(0, 0, this.width, this.height);

    const nodes = g.nodes || [];
    const edges = g.edges || [];
    const visited = new Set(g.visited || []);
    const mstSet = new Set((g.mstEdges || []).map(e => `${e.from}-${e.to}`));
    const current = g.current;

    this._layoutNodes(nodes);

    edges.forEach(([a, b, weight]) => {
      const from = this.nodePositions[a], to = this.nodePositions[b];
      if (!from || !to) return;
      const isMst = mstSet.has(`${a}-${b}`) || mstSet.has(`${b}-${a}`);
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.strokeStyle = isMst ? T.mstEdge : T.edge;
      ctx.lineWidth = isMst ? 3 : 1.5;
      ctx.stroke();

      if (weight != null) {
        const mx = (from.x + to.x) / 2;
        const my = (from.y + to.y) / 2;
        const label = String(weight);
        ctx.font = 'bold 11px JetBrains Mono, monospace';
        const labelWidth = ctx.measureText(label).width;
        ctx.fillStyle = T.weightBg;
        ctx.fillRect(mx - labelWidth / 2 - 4, my - 8, labelWidth + 8, 16);
        ctx.fillStyle = isMst ? T.mstEdge : T.weight;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, mx, my);
      }
    });

    nodes.forEach(n => {
      const pos = this.nodePositions[n];
      if (!pos) return;
      const isCurrent = n === current;
      const isVisited = visited.has(n);
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = isCurrent ? T.current : isVisited ? T.visited : T.node;
      ctx.fill();
      ctx.strokeStyle = T.nodeBorder;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = isCurrent || isVisited ? T.activeText : T.text;
      ctx.font = 'bold 14px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(n, pos.x, pos.y);
    });

    if (g.queue && g.queue.length > 0) {
      ctx.fillStyle = T.queue;
      ctx.font = '12px JetBrains Mono, monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(`Queue: [${g.queue.join(', ')}]`, 16, this.height - 24);
    }
    if (g.order && g.order.length > 0) {
      ctx.fillStyle = T.text;
      ctx.font = '12px JetBrains Mono, monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(`Visit order: ${g.order.join(' → ')}`, 16, this.height - 8);
    }
  }

  destroy() {
    this.step = null;
    this.ctx.clearRect(0, 0, this.width, this.height);
  }
}
