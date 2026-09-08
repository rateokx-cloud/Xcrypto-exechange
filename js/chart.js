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
    // Use existing canvas dimensions if already set correctly
    if (this.canvas.width < 10) {
      const parent = this.canvas.parentElement;
      const w = (parent && parent.clientWidth > 0) ? parent.clientWidth
                : (window.innerWidth - 200 - 280 - 8);
      this.canvas.width  = Math.max(w, 300);
      this.canvas.height = 340;
    }
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


// ── TradingView Lightweight Charts Integration ────────────────────────────
let tvChart = null;
let tvSeries = null;
let tvVolSeries = null;
let _tvType = 'candle';

function initTVChart(containerId, type) {
  _tvType = type || 'candle';
  const container = document.getElementById(containerId);
  if (!container) { console.warn('[Chart] Container not found:', containerId); return null; }
  if (typeof LightweightCharts === 'undefined') {
    console.warn('[Chart] LightweightCharts not loaded');
    return null;
  }

  // Destroy existing chart
  if (tvChart) {
    try { tvChart.remove(); } catch(e) {}
    tvChart = null; tvSeries = null; tvVolSeries = null;
  }
  container.innerHTML = '';

  // Get width — try multiple methods
  let w = container.clientWidth
       || container.offsetWidth
       || container.getBoundingClientRect().width
       || (container.parentElement ? container.parentElement.clientWidth : 0)
       || 600;
  w = Math.floor(Math.max(w, 300));

  console.log('[Chart] Init TV chart, container width:', w, 'type:', _tvType);

  try {
    tvChart = LightweightCharts.createChart(container, {
      width: w,
      height: 310,
      layout: {
        background: { type: 'solid', color: '#0b0e11' },
        textColor: '#848e9c',
        fontSize: 11,
        fontFamily: 'Inter, -apple-system, sans-serif',
      },
      grid: {
        vertLines: { color: '#1c2030', style: 0 },
        horzLines: { color: '#1c2030', style: 0 },
      },
      crosshair: { mode: 1 },
      rightPriceScale: {
        borderColor: '#252c3b',
        textColor: '#848e9c',
        scaleMargins: { top: 0.08, bottom: 0.18 },
      },
      timeScale: {
        borderColor: '#252c3b',
        timeVisible: true,
        secondsVisible: false,
        barSpacing: 6,
        rightOffset: 3,
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true },
      handleScale: { mouseWheel: true, pinch: true },
    });

    // Main series
    if (_tvType === 'candle') {
      tvSeries = tvChart.addCandlestickSeries({
        upColor:         '#0ecb81',
        downColor:       '#f6465d',
        borderUpColor:   '#0ecb81',
        borderDownColor: '#f6465d',
        wickUpColor:     '#0ecb81',
        wickDownColor:   '#f6465d',
        priceLineVisible: true,
        priceLineWidth:  1,
        priceLineColor:  '#848e9c',
        priceLineStyle:  1,
      });
    } else {
      tvSeries = tvChart.addLineSeries({
        color: '#02c076',
        lineWidth: 2,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 4,
        priceLineVisible: true,
        priceLineWidth: 1,
        priceLineColor: '#02c076',
      });
    }

    // Volume histogram (bottom 18%)
    tvVolSeries = tvChart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: 'vol',
      color: '#26a69a',
    });
    tvChart.priceScale('vol').applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
    });

    // Auto-resize on container size change
    if (window.ResizeObserver) {
      const ro = new ResizeObserver(() => {
        if (!tvChart) return;
        const newW = container.clientWidth;
        if (newW > 0) tvChart.applyOptions({ width: newW });
      });
      ro.observe(container);
    }

    console.log('[Chart] TradingView chart initialized, type:', _tvType);
    return tvChart;

  } catch (err) {
    console.error('[Chart] TradingView init failed:', err);
    tvChart = null; tvSeries = null; tvVolSeries = null;
    return null;
  }
}

function loadTVChartData(candles, type) {
  if (!candles || !candles.length) return;
  _tvType = type || _tvType || 'candle';

  if (!tvSeries) {
    console.warn('[Chart] tvSeries not ready, reinitializing...');
    initTVChart('tvChart', _tvType);
    if (!tvSeries) return;
  }

  // Binance returns timestamps in ms, TradingView needs seconds
  function toSec(t) {
    return t > 1e12 ? Math.floor(t / 1000) : Math.floor(t);
  }

  try {
    if (_tvType === 'candle') {
      const raw = candles.map(c => ({
        time:  toSec(c.time),
        open:  parseFloat(c.open)  || 0,
        high:  parseFloat(c.high)  || 0,
        low:   parseFloat(c.low)   || 0,
        close: parseFloat(c.close) || 0,
      })).filter(d => d.open > 0 && d.high >= d.low && d.low > 0);

      raw.sort((a, b) => a.time - b.time);
      const seen = new Set();
      const data = raw.filter(d => {
        if (seen.has(d.time)) return false;
        seen.add(d.time);
        return true;
      });
      if (data.length) tvSeries.setData(data);

    } else {
      const raw = candles.map(c => ({
        time:  toSec(c.time),
        value: parseFloat(c.close) || 0,
      })).filter(d => d.value > 0);

      raw.sort((a, b) => a.time - b.time);
      const seen = new Set();
      const data = raw.filter(d => {
        if (seen.has(d.time)) return false;
        seen.add(d.time);
        return true;
      });
      if (data.length) tvSeries.setData(data);
    }

    // Volume
    if (tvVolSeries) {
      const raw = candles.map(c => ({
        time:  toSec(c.time),
        value: parseFloat(c.vol) || 0,
        color: (parseFloat(c.close) >= parseFloat(c.open))
          ? 'rgba(14,203,129,0.45)'
          : 'rgba(246,70,93,0.45)',
      }));
      raw.sort((a, b) => a.time - b.time);
      const seen = new Set();
      const data = raw.filter(d => {
        if (seen.has(d.time)) return false;
        seen.add(d.time);
        return true;
      });
      if (data.length) tvVolSeries.setData(data);
    }

    if (tvChart) tvChart.timeScale().fitContent();
    console.log('[Chart] Data loaded:', candles.length, 'candles');

  } catch (err) {
    console.error('[Chart] loadTVChartData error:', err);
  }
}

// Update last candle in real-time (for live ticker)
function updateTVLastCandle(price) {
  if (!tvSeries || !tvChart) return;
  try {
    const now = Math.floor(Date.now() / 1000);
    const roundedTime = now - (now % 3600); // round to hour
    if (_tvType === 'candle') {
      tvSeries.update({
        time: roundedTime,
        open: price * 0.9999,
        high: price * 1.0002,
        low:  price * 0.9997,
        close: price,
      });
    } else {
      tvSeries.update({ time: now, value: price });
    }
  } catch(e) {}
}
