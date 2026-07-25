// ============================================
// CRYPTOX — CANVAS CHART (Complete Fix)
// ============================================

class CryptoChart {
  constructor(canvasId, options) {
    this.canvasId = canvasId;
    this.options  = Object.assign({ type: 'candle' }, options || {});
    this.candles  = [];
    this.canvas   = null;
    this.ctx      = null;
  }

  // Set canvas size and get 2d context
  _setup() {
    this.canvas = document.getElementById(this.canvasId);
    if (!this.canvas) return false;
    const parent = this.canvas.parentElement;
    const w = (parent && parent.clientWidth > 0) ? parent.clientWidth
              : (window.innerWidth - 200 - 280 - 4);
    this.canvas.width  = Math.max(w, 300);
    this.canvas.height = 310;
    this.ctx = this.canvas.getContext('2d');
    return true;
  }

  load(candles) {
    this.candles = candles || [];
    if (!this._setup()) return;
    this.draw();
  }

  draw() {
    if (!this.canvas || !this.ctx || !this.candles.length) return;
    const cv = this.canvas;
    const ctx = this.ctx;
    const W = cv.width;
    const H = cv.height;

    // Clear
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0b0e11';
    ctx.fillRect(0, 0, W, H);

    const pad = { top: 20, right: 70, bottom: 32, left: 8 };
    const cW  = W - pad.left - pad.right;
    const cH  = H - pad.top  - pad.bottom;
    if (cW <= 0 || cH <= 0) return;

    // Price range
    const prices = this.candles.flatMap(c => [c.high, c.low]);
    const minP   = Math.min(...prices) * 0.9985;
    const maxP   = Math.max(...prices) * 1.0015;
    const range  = maxP - minP || 1;
    const toY    = p => pad.top + cH - ((p - minP) / range) * cH;
    const n      = this.candles.length;
    const barW   = Math.max(1.5, (cW / n) - 1);

    // Grid horizontal lines
    ctx.lineWidth   = 1;
    ctx.strokeStyle = '#1c2030';
    ctx.font        = '10px Inter, Arial, sans-serif';
    ctx.textAlign   = 'left';
    ctx.fillStyle   = '#4b5360';
    for (let i = 0; i <= 5; i++) {
      const y = pad.top + (cH / 5) * i;
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
      const pv = maxP - (range / 5) * i;
      const label = pv >= 10000 ? pv.toFixed(0)
                  : pv >= 1     ? pv.toFixed(2)
                  : pv.toFixed(6);
      ctx.fillStyle = '#4b5360';
      ctx.fillText(label, W - pad.right + 3, y + 3);
    }

    if (this.options.type === 'line') {
      // LINE chart
      const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + cH);
      grad.addColorStop(0, 'rgba(2,192,118,0.3)');
      grad.addColorStop(1, 'rgba(2,192,118,0)');

      ctx.beginPath();
      this.candles.forEach((c, i) => {
        const x = pad.left + (i / (n - 1)) * cW;
        const y = toY(c.close);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.strokeStyle = '#02c076';
      ctx.lineWidth   = 1.5;
      ctx.lineJoin    = 'round';
      ctx.stroke();

      const lx = pad.left + cW;
      ctx.lineTo(lx, pad.top + cH);
      ctx.lineTo(pad.left, pad.top + cH);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

    } else {
      // CANDLE chart
      this.candles.forEach((c, i) => {
        const x    = pad.left + (i / n) * cW;
        const midX = x + barW / 2;
        const isUp = c.close >= c.open;
        const col  = isUp ? '#0ecb81' : '#f6465d';

        ctx.strokeStyle = col;
        ctx.fillStyle   = col;
        ctx.lineWidth   = 1;

        // Wick high-low
        ctx.beginPath();
        ctx.moveTo(midX, toY(c.high));
        ctx.lineTo(midX, toY(c.low));
        ctx.stroke();

        // Body open-close
        const bTop = Math.min(toY(c.open), toY(c.close));
        const bH   = Math.max(1, Math.abs(toY(c.open) - toY(c.close)));
        ctx.fillRect(x, bTop, Math.max(barW - 1, 1), bH);
      });
    }

    // Volume bars (bottom 15% of chart)
    const maxVol = Math.max(...this.candles.map(c => c.vol || c.volume || 0)) || 1;
    const volH   = cH * 0.14;
    this.candles.forEach((c, i) => {
      const x   = pad.left + (i / n) * cW;
      const vol = c.vol || c.volume || 0;
      const vh  = (vol / maxVol) * volH;
      ctx.fillStyle = (c.close >= c.open)
        ? 'rgba(14,203,129,0.35)' : 'rgba(246,70,93,0.35)';
      ctx.fillRect(x, pad.top + cH - vh, Math.max(barW - 1, 1), vh);
    });

    // Last price dashed line
    if (n > 0) {
      const last = this.candles[n - 1];
      const ly   = toY(last.close);
      ctx.strokeStyle = last.close >= last.open
        ? 'rgba(14,203,129,0.5)' : 'rgba(246,70,93,0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(pad.left, ly);
      ctx.lineTo(W - pad.right, ly);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}

// ── Admin line chart helper ──────────────────────────
function drawAdminLineChart(canvasId, labels, data, color) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const parent = canvas.parentElement;
  canvas.width  = (parent && parent.clientWidth > 0) ? parent.clientWidth : 400;
  canvas.height = parseInt(canvas.getAttribute('height')) || 180;
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#0b0e11';
  ctx.fillRect(0, 0, W, H);

  const pad = { top: 14, right: 14, bottom: 26, left: 50 };
  const cW  = W - pad.left - pad.right;
  const cH  = H - pad.top  - pad.bottom;
  const max = Math.max(...data.filter(Boolean)) * 1.1 || 1;
  const toY = v => pad.top + cH - (v / max) * cH;

  ctx.strokeStyle = '#1c2030';
  ctx.lineWidth   = 1;
  ctx.font        = '10px Inter, Arial, sans-serif';
  ctx.textAlign   = 'right';
  ctx.fillStyle   = '#4b5360';
  for (let i = 0; i <= 4; i++) {
    const y  = pad.top + (cH / 4) * i;
    const pv = max - (max / 4) * i;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
    ctx.fillText(pv >= 1000 ? (pv / 1000).toFixed(1) + 'K' : pv.toFixed(0), pad.left - 3, y + 3);
  }

  if (data.length < 2) return;

  const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + cH);
  grad.addColorStop(0, color + '55');
  grad.addColorStop(1, color + '00');

  ctx.beginPath();
  data.forEach((v, i) => {
    const x = pad.left + (i / (data.length - 1)) * cW;
    i === 0 ? ctx.moveTo(x, toY(v)) : ctx.lineTo(x, toY(v));
  });
  ctx.strokeStyle = color;
  ctx.lineWidth   = 2;
  ctx.lineJoin    = 'round';
  ctx.stroke();
  ctx.lineTo(pad.left + cW, pad.top + cH);
  ctx.lineTo(pad.left, pad.top + cH);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.fillStyle   = '#4b5360';
  ctx.textAlign   = 'center';
  labels.forEach((l, i) => {
    if (i % Math.ceil(labels.length / 7) === 0) {
      const x = pad.left + (i / (labels.length - 1)) * cW;
      ctx.fillText(l, x, H - 5);
    }
  });
}
