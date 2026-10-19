const THEMES = {
  dark: {
    bg: '#1e1e2e', cell: '#313244', border: '#585b70',
    highlight: '#f9e2af', text: '#cdd6f4', accent: '#cba6f7', arrow: '#585b70',
  },
  light: {
    bg: '#f7f8fc', cell: '#e3e8f2', border: '#aab4c8',
    highlight: '#ff913c', text: '#1c2740', accent: '#3d6fe0', arrow: '#7b879d',
  },
};

function getTheme() {
  return document.documentElement.getAttribute('data-theme') === 'light'
    ? THEMES.light : THEMES.dark;
}

export class DataStructureRenderer {
  constructor(canvasEl) {
    this.canvas = canvasEl;
    this.ctx = canvasEl.getContext('2d');
    this.cellW = 56;
    this.cellH = 56;
    this.gap = 6;
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

  draw(step) {
    this.step = step;
    const { ctx } = this;
    const d = step.data || step;
    const values = d.values || [];
    const highlighted = d.highlighted;
    const type = d.type || step.ds || 'array';
    const colors = getTheme();
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, this.width, this.height);

    if (type === 'stack') {
      this._drawVertical(values, highlighted, colors);
    } else if (type === 'queue') {
      this._drawHorizontal(values, highlighted, colors);
    } else if (type.startsWith('linked-list') || type === 'singly' || type === 'doubly' || type === 'circular' || type === 'ordered') {
      this._drawLinkedList(values, highlighted, type, colors);
    } else {
      this._drawHorizontal(values, highlighted, colors);
    }
  }

  _drawHorizontal(values, highlighted, colors) {
    const { ctx } = this;
    const totalW = values.length * (this.cellW + this.gap) - this.gap;
    const startX = (this.width - totalW) / 2 + this.cellW / 2;
    const y = this.height / 2;

    values.forEach((val, i) => {
      const x = startX + i * (this.cellW + this.gap);
      ctx.fillStyle = i === highlighted ? colors.highlight : colors.cell;
      ctx.beginPath();
      ctx.roundRect(x - this.cellW / 2, y - this.cellH / 2, this.cellW, this.cellH, 6);
      ctx.fill();
      ctx.strokeStyle = colors.border;
      ctx.lineWidth = i === highlighted ? 3 : 1.5;
      ctx.stroke();

      ctx.fillStyle = colors.text;
      ctx.font = 'bold 18px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(val), x, y - 4);

      ctx.fillStyle = colors.accent;
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.fillText(`[${i}]`, x, y + this.cellH / 2 - 8);
    });
  }

  _drawVertical(values, highlighted, colors) {
    const { ctx } = this;
    const totalH = values.length * (this.cellH + this.gap) - this.gap;
    const startY = (this.height - totalH) / 2 + this.cellH / 2;
    const x = this.width / 2;

    values.forEach((val, i) => {
      const y = startY + i * (this.cellH + this.gap);
      ctx.fillStyle = i === highlighted ? colors.highlight : colors.cell;
      ctx.beginPath();
      ctx.roundRect(x - this.cellW / 2, y - this.cellH / 2, this.cellW, this.cellH, 6);
      ctx.fill();
      ctx.strokeStyle = colors.border;
      ctx.lineWidth = i === highlighted ? 3 : 1.5;
      ctx.stroke();

      ctx.fillStyle = colors.text;
      ctx.font = 'bold 18px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(val), x, y - 4);

      if (i === values.length - 1) {
        ctx.fillStyle = colors.accent;
        ctx.font = '10px JetBrains Mono, monospace';
        ctx.fillText('← TOP', x + this.cellW / 2 + 10, y);
      }
    });
  }

  _drawLinkedList(values, highlighted, type, colors) {
    const { ctx } = this;
    const totalW = values.length * (this.cellW + this.gap + 20) - this.gap;
    const startX = (this.width - totalW) / 2 + this.cellW / 2;
    const y = this.height / 2;

    values.forEach((val, i) => {
      const x = startX + i * (this.cellW + this.gap + 20);
      ctx.fillStyle = i === highlighted ? colors.highlight : colors.cell;
      ctx.beginPath();
      ctx.roundRect(x - this.cellW / 2, y - this.cellH / 2, this.cellW, this.cellH, 6);
      ctx.fill();
      ctx.strokeStyle = colors.border;
      ctx.lineWidth = i === highlighted ? 3 : 1.5;
      ctx.stroke();

      ctx.fillStyle = colors.text;
      ctx.font = 'bold 16px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(val), x, y);

      if (i < values.length - 1) {
        const arrowX = x + this.cellW / 2 + 4;
        ctx.beginPath();
        ctx.moveTo(arrowX, y);
        ctx.lineTo(arrowX + 12, y);
        ctx.strokeStyle = colors.arrow;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(arrowX + 12, y);
        ctx.lineTo(arrowX + 6, y - 4);
        ctx.lineTo(arrowX + 6, y + 4);
        ctx.closePath();
        ctx.fillStyle = colors.arrow;
        ctx.fill();

        if (type === 'doubly') {
          ctx.beginPath();
          ctx.moveTo(arrowX, y + 12);
          ctx.lineTo(arrowX + 12, y + 12);
          ctx.strokeStyle = colors.arrow;
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(arrowX, y + 12);
          ctx.lineTo(arrowX + 6, y + 8);
          ctx.lineTo(arrowX + 6, y + 16);
          ctx.closePath();
          ctx.fillStyle = colors.arrow;
          ctx.fill();
        }
      }

      if (type === 'circular' && i === values.length - 1) {
        const arrowX = x + this.cellW / 2 + 4;
        const firstX = startX;
        ctx.beginPath();
        ctx.moveTo(arrowX, y + 24);
        ctx.quadraticCurveTo((arrowX + firstX) / 2, y + 48, firstX - this.cellW / 2, y + 24);
        ctx.strokeStyle = colors.arrow;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    });
  }

  destroy() {
    this.step = null;
    this.ctx.clearRect(0, 0, this.width, this.height);
  }
}
