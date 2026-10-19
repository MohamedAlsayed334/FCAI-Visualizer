const THEMES = {
  dark: {
    bg: '#1e1e2e', node: '#313244', border: '#585b70', text: '#cdd6f4',
    highlight: '#f9e2af', highlightText: '#1e1e2e', muted: '#9399b2',
    edge: '#585b70', label: '#9399b2',
  },
  light: {
    bg: '#f7f8fc', node: '#e3e8f2', border: '#aab4c8', text: '#1c2740',
    highlight: '#ff913c', highlightText: '#1c2740', muted: '#5b6880',
    edge: '#aab4c8', label: '#5b6880',
  },
};

function getTheme() {
  return document.documentElement.getAttribute('data-theme') === 'light'
    ? THEMES.light : THEMES.dark;
}

// Adapter matching CanvasRenderer's API. Draws the plain-object snapshots
// produced by the existing BST/AVL engines at any playback tick.
export class TreeCanvasRenderer {
  constructor(canvasEl) {
    this.canvas = canvasEl;
    this.ctx = canvasEl.getContext('2d');
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

  draw(steps, stepIdx) {
    const step = Array.isArray(steps) ? steps[Math.max(0, stepIdx)] : steps;
    this.step = step || null;
    const { ctx } = this;
    const T = getTheme();
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.fillStyle = T.bg;
    ctx.fillRect(0, 0, this.width, this.height);

    const root = step?.tree ?? null;
    if (!root) {
      ctx.fillStyle = T.muted;
      ctx.font = '13px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(step?.msg || 'Press Play to insert values.', this.width / 2, this.height / 2);
      return;
    }

    const nodes = [];
    const visit = (node, depth) => {
      if (!node) return;
      visit(node.left, depth + 1);
      nodes.push({ node, depth });
      visit(node.right, depth + 1);
    };
    visit(root, 0);

    const count = nodes.length;
    const maxDepth = nodes.reduce((max, entry) => Math.max(max, entry.depth), 0);
    const marginX = 30, marginTop = 30, marginBottom = 28;
    const usableW = Math.max(1, this.width - marginX * 2);
    const usableH = Math.max(1, this.height - marginTop - marginBottom);
    const stepX = count > 1 ? Math.min(usableW / (count - 1), 90) : 0;
    const stepY = maxDepth > 0 ? Math.min(usableH / maxDepth, 72) : 0;
    const startX = (this.width - stepX * (count - 1)) / 2;
    const positions = new Map();
    nodes.forEach((entry, index) => {
      entry.x = startX + index * stepX;
      entry.y = marginTop + entry.depth * stepY;
      positions.set(entry.node, entry);
    });

    const radius = Math.max(7, Math.min(16,
      stepX > 0 ? stepX / 2 - 5 : 16,
      stepY > 0 ? stepY / 2 - 5 : 16));
    const fontSize = Math.max(8, Math.min(12, radius));

    nodes.forEach(({ node }) => {
      for (const child of [node.left, node.right]) {
        if (!child) continue;
        const from = positions.get(node);
        const to = positions.get(child);
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.strokeStyle = T.edge;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    });

    nodes.forEach(({ node, x, y }) => {
      const isInserted = step?.inserted === node.value;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = isInserted ? T.highlight
        : node.color === 'red' ? '#d94f59'
          : node.color === 'black' ? '#30465c' : T.node;
      ctx.fill();
      ctx.strokeStyle = T.border;
      ctx.lineWidth = isInserted ? 2.5 : 1.5;
      ctx.stroke();

      ctx.fillStyle = node.color === 'red' || node.color === 'black'
        ? '#ffffff' : isInserted ? T.highlightText : T.text;
      ctx.font = `700 ${fontSize}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(node.value), x, y);
    });

    ctx.fillStyle = T.label;
    ctx.font = '11px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(`height ${maxDepth} · ${count} node${count === 1 ? '' : 's'}`, 12, this.height - 10);
  }

  destroy() {
    this.step = null;
    this.ctx.clearRect(0, 0, this.width, this.height);
  }
}
