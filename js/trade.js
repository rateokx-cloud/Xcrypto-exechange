// ============================================
// CRYPTOX — TRADE PAGE JS (Binance-Style)
// ============================================
const COIN_COLORS_T = {BTC:'#F7931A',ETH:'#627EEA',BNB:'#F0B90B',SOL:'#9945FF',XRP:'#00AAE4',ADA:'#3CCAB0',AVAX:'#E84142',DOGE:'#C2A633',USDT:'#26A17B',DOT:'#E6007A',MATIC:'#8247E5',LINK:'#2A5ADA',TRX:'#FF0013',NEAR:'#00C1DE',ARB:'#28A0F0',UNI:'#FF007A',LTC:'#BFBBBB',ATOM:'#6F7390',XLM:'#14B6E7',FIL:'#0090FF'};

let currentBase   = 'BTC';
let currentPair   = 'BTC/USDT';
let currentPrice  = 67450;
let buyOrderType  = 'limit';
let sellOrderType = 'limit';
let psTab         = 'USDT';
let obLayout      = 'both';
let chart;
let liveTimer, obTimer, tradeTimer;

// ── Binance Integration ──────────────────────────────────────────────────
// BINANCE_SYMBOL_MAP sudah di data.js — jangan redeclare, tambah saja coin baru
// yang belum ada di data.js (jika ada)
const INTERVAL_MAP = {'1m':'1m','5m':'5m','15m':'15m','1h':'1h','4h':'4h','1d':'1d','1w':'1w'};

let _binWS = null, _tickerWS = null, _currentInterval = '1h', _pollInterval = null;

async function fetchBinanceKlines(symbol, interval, limit) {
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit||200}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const raw = await res.json();
  return raw.map(k => ({ time: k[0], open: +k[1], high: +k[2], low: +k[3], close: +k[4], vol: +k[5] }));
}

function startBinanceWS(symbol, interval) {
  if (_binWS)    { try{_binWS.close();}catch(e){} _binWS = null; }
  if (_tickerWS) { try{_tickerWS.close();}catch(e){} _tickerWS = null; }
  const sym = symbol.toLowerCase();

  // Kline stream
  try {
    _binWS = new WebSocket(`wss://stream.binance.com:9443/ws/${sym}@kline_${interval}`);
    _binWS.onmessage = function(e) {
      try {
        const k = JSON.parse(e.data).k;
        if (!k) return;
        currentPrice = +k.c;
        const coin = COINS.find(c => c.id === currentBase);
        if (coin) coin.price = currentPrice;
        // Update canvas chart last candle
        if (chart && chart.candles && chart.candles.length) {
          const last = chart.candles[chart.candles.length - 1];
          last.close = +k.c; last.high = Math.max(last.high, +k.h);
          last.low   = Math.min(last.low,  +k.l);
          chart.draw();
        }
        updateChartPriceTag();
      } catch(err) {}
    };
    _binWS.onerror = () => _startPollingFallback();
    console.log('[WS] Kline connected:', sym, interval);
  } catch(e) { _startPollingFallback(); }

  // Mini ticker stream (price + stats)
  try {
    _tickerWS = new WebSocket(`wss://stream.binance.com:9443/ws/${sym}@miniTicker`);
    _tickerWS.onmessage = function(e) {
      try {
        const d = JSON.parse(e.data);
        if (!d || !d.c) return;
        const price = +d.c, change = ((+d.c - +d.o) / +d.o * 100);
        currentPrice = price;
        const coin = COINS.find(c => c.id === currentBase);
        if (coin) { coin.price = price; coin.change = +change.toFixed(2); }
        _updatePriceUI(price, change, +d.h, +d.l, +d.v);
      } catch(err) {}
    };
  } catch(e) {}
}

function _updatePriceUI(price, change, high, low, vol) {
  const isUp = change >= 0;
  const fp = p => p >= 1000 ? p.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}) : p >= 1 ? p.toFixed(4) : p.toFixed(6);
  const pnav = document.getElementById('pairPriceNav');
  if (pnav) { pnav.textContent = '$'+fp(price); pnav.className = 'ps-live-price '+(isUp?'positive':'negative'); }
  const cnav = document.getElementById('pairChangeNav');
  if (cnav) { cnav.textContent = (isUp?'+':'')+change.toFixed(2)+'%'; cnav.className = 'ps-live-chg '+(isUp?'positive':'negative'); }
  setEl('navChange', (isUp?'+':'')+change.toFixed(2)+'%', isUp?'pstat-val positive':'pstat-val negative');
  setEl('navHigh',   '$'+fp(high));
  setEl('navLow',    '$'+fp(low));
  const mp = document.getElementById('obMidPrice');
  if (mp) { mp.textContent = '$'+fp(price); mp.className = 'ob-mid-price '+(isUp?'positive':'negative'); }
  const mu = document.getElementById('obMidUsd');
  if (mu) mu.textContent = fp(price);
  updateChartPriceTag();
}

function _startPollingFallback() {
  if (_pollInterval) return;
  _pollInterval = setInterval(async () => {
    try {
      const sym = BINANCE_SYMBOL_MAP[currentBase];
      if (!sym) return;
      const res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${sym}`,{signal:AbortSignal.timeout(3000)});
      const d = await res.json();
      if (d && d.lastPrice) {
        const p = +d.lastPrice, ch = +d.priceChangePercent;
        currentPrice = p;
        const coin = COINS.find(c => c.id === currentBase);
        if (coin) { coin.price = p; coin.change = ch; }
        _updatePriceUI(p, ch, +d.highPrice, +d.lowPrice, +d.volume);
      }
    } catch(e) {}
  }, 2000);
}

// ─── INIT ───────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Parse URL
  const p = new URLSearchParams(location.search).get('pair');
  if (p) {
    const cleaned = p.toUpperCase().replace('USDT','').replace('/USDT','');
    if (COINS.find(c => c.id === cleaned)) {
      currentBase  = cleaned;
      currentPair  = cleaned + '/USDT';
    }
  }
  const coin = COINS.find(c => c.id === currentBase) || COINS[0];
  currentPrice = coin.price;

  // Auth
  await initAuthOnLoad();
  const user = getCurrentUser();
  updateNavAuth(user);

  // Init canvas chart
  chart = new CryptoChart('tradeChart', { type: 'candle' });

  // Use ResizeObserver to draw as soon as container has a real size
  const chartArea = document.querySelector('.chart-area');
  if (chartArea && window.ResizeObserver) {
    const ro = new ResizeObserver(entries => {
      const w = entries[0].contentRect.width;
      if (w > 50) {
        ro.disconnect();
        loadChartData();
        window.addEventListener('resize', resizeChart);
      }
    });
    ro.observe(chartArea);
  } else {
    // Fallback for older browsers
    setTimeout(loadChartData, 100);
    setTimeout(loadChartData, 500);
    window.addEventListener('resize', resizeChart);
  }

  // Render everything
  renderPairsList();
  renderPairDrop();
  renderOrderBook();
  renderRecentTradesList();
  updatePairHeader();
  updateOrderForms(user);
  loadOpenOrders();

  // Chart toolbar
  document.querySelectorAll('.ct-b[data-i]').forEach(btn => {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.ct-b[data-i]').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      loadChartData();
    });
  });

  // Start live feeds
  startLiveUpdates();

  // Close pair dropdown on outside click
  document.addEventListener('click', e => {
    const drop = document.getElementById('pairDrop');
    if (drop && !e.target.closest('#pairSelectorBtn')) {
      drop.style.display = 'none';
    }
  });
});

function resizeChart() {
  // Debounce resize
  clearTimeout(window._resizeTimer);
  window._resizeTimer = setTimeout(loadChartData, 100);
}

function updateNavAuth(user) {
  const el = document.getElementById('navAuthArea');
  if (!el) return;
  if (user) {
    el.innerHTML = `
      <a href="dashboard.html" class="btn btn-dark btn-sm" style="height:30px;font-size:12px">Dashboard</a>
      <a href="deposit.html" class="btn btn-primary btn-sm" style="height:30px;font-size:12px"><i class="fas fa-arrow-down"></i> Deposit</a>
      <div class="user-nav" style="padding:2px 8px">
        <div class="avatar" style="width:26px;height:26px;font-size:10px">${(user.name||'U').slice(0,2).toUpperCase()}</div>
        <i class="fas fa-chevron-down" style="font-size:9px;color:var(--t3);margin-left:2px"></i>
        <div class="dropdown" style="right:0;top:calc(100%+4px)">
          <div style="padding:10px 14px;border-bottom:1px solid var(--border)">
            <div style="font-size:13px;font-weight:700;color:var(--white)">${user.name||user.email||'User'}</div>
            <div style="font-size:11px;color:var(--t3)">${user.email||''}</div>
          </div>
          <div class="drop-item" onclick="location.href='dashboard.html'"><i class="fas fa-home"></i> Dashboard</div>
          <div class="drop-item" onclick="location.href='wallet.html'"><i class="fas fa-wallet"></i> Assets</div>
          <div class="drop-item" onclick="location.href='orders.html'"><i class="fas fa-list"></i> My Orders</div>
          <div class="drop-divider"></div>
          <div class="drop-item" style="color:var(--red)" onclick="authLogout()"><i class="fas fa-sign-out-alt"></i> Log Out</div>
        </div>
      </div>`;
  } else {
    el.innerHTML = `
      <a href="login.html" class="btn btn-ghost btn-sm" style="height:30px;font-size:12px">Log In</a>
      <a href="register.html" class="btn btn-primary btn-sm" style="height:30px;font-size:12px">Sign Up</a>`;
  }
}

// ─── CHART ──────────────────────────────────────────
async function loadChartData() {
  const cv = document.getElementById('tradeChart');
  if (!cv) { console.error('[Chart] tradeChart not found'); return; }

  // Calculate width from multiple sources
  let w = 0;
  const parent = cv.parentElement;
  if (parent) {
    const rect = parent.getBoundingClientRect();
    w = rect.width || parent.clientWidth || parent.offsetWidth;
  }
  // If still 0, compute from window
  if (w < 10) {
    const sidebar = 200;   // left panel
    const orderbook = 280; // right panel
    w = window.innerWidth - sidebar - orderbook - 8;
  }
  w = Math.max(Math.floor(w), 300);

  cv.width  = w;
  cv.height = 340;
  cv.style.display  = 'block';
  cv.style.width    = w + 'px';
  cv.style.height   = '340px';
  console.log('[Chart] loadChartData w=' + w);

  // Get interval from toolbar
  const activeBtn = document.querySelector('.ct-b[data-i].active');
  const interval  = INTERVAL_MAP ? (INTERVAL_MAP[activeBtn?.dataset?.i || '1h'] || '1h') : '1h';
  _currentInterval = interval;

  // Try fetch real Binance data
  const binSym = BINANCE_SYMBOL_MAP ? BINANCE_SYMBOL_MAP[currentBase] : null;
  let candles = null;

  if (binSym) {
    try {
      candles = await fetchBinanceKlines(binSym, interval, 200);
      // Update price from latest candle
      const last = candles[candles.length - 1];
      if (last && last.close > 0) {
        currentPrice = last.close;
        const coin = COINS.find(c => c.id === currentBase);
        if (coin) coin.price = currentPrice;
        updatePairHeader();
      }
      // Start WebSocket for live updates
      startBinanceWS(binSym, interval);
      console.log('[Chart] Binance:', candles.length, 'candles,', binSym, interval);
    } catch(e) {
      console.warn('[Chart] Binance failed:', e.message);
      candles = null;
      if (typeof _startPollingFallback === 'function') _startPollingFallback();
    }
  }

  // Fallback to simulated
  if (!candles || !candles.length) candles = generateCandles(currentPrice, 200);

  // Draw on canvas
  if (chart) {
    chart.canvas  = cv;
    chart.ctx     = cv.getContext('2d');
    chart.candles = candles;
    chart.draw();
  }
  updateChartPriceTag();
  console.log('[Chart] Canvas drawn, w:', w, 'candles:', candles.length);
}

function setChartType(type, btn) {
  document.querySelectorAll('.ct-b[id^="chartType"]').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  if (chart) {
    chart.options.type = type;
    if (chart.candles && chart.candles.length) chart.draw();
  }
}

function updateChartPriceTag() {
  const el = document.getElementById('chartPriceTag');
  if (!el) return;
  const coin = COINS.find(c => c.id === currentBase);
  if (!coin) return;
  el.textContent = '$' + fmt(currentPrice, currentPrice);
  el.style.background = coin.change >= 0 ? 'var(--green)' : 'var(--red)';
}

// ─── PAIR HEADER ────────────────────────────────────
function updatePairHeader() {
  const coin = COINS.find(c => c.id === currentBase) || COINS[0];
  const color = COIN_COLORS_T[currentBase] || '#888';
  const isUp  = coin.change >= 0;

  // Navbar pair selector
  const ico = document.getElementById('pairIco');
  if (ico) { ico.textContent = currentBase.slice(0,3); ico.style.background = color+'22'; ico.style.color = color; }

  const title = document.getElementById('pairTitle');
  if (title) title.textContent = currentPair;

  const pnav = document.getElementById('pairPriceNav');
  if (pnav) { pnav.textContent = '$' + fmt(currentPrice, currentPrice); pnav.className = 'ps-live-price ' + (isUp ? 'positive' : 'negative'); }

  const cnav = document.getElementById('pairChangeNav');
  if (cnav) { cnav.textContent = (isUp?'+':'') + coin.change.toFixed(2) + '%'; cnav.className = 'ps-live-chg ' + (isUp ? 'positive' : 'negative'); }

  // Stats strip
  setEl('navChange',  (isUp?'+':'') + coin.change.toFixed(2) + '%', isUp ? 'positive' : 'negative');
  setEl('navHigh',    '$' + fmt(currentPrice * 1.03, currentPrice));
  setEl('navLow',     '$' + fmt(currentPrice * 0.97, currentPrice));
  setEl('navVol',     coin.vol || '--');
  setEl('navVolUsdt', '$' + (currentPrice * (parseFloat((coin.vol||'0').replace(/[^0-9.]/g,''))||0) * 1000).toFixed(0));

  // Order book base label
  ['obBaseLbl'].forEach(id => setEl(id, currentBase));
  // Recent trades label
  setEl('rtPairLbl', currentPair);
  // Order form symbols
  ['buyBtnSym','sellBtnSym','buyAmtSuffix','sellAmtSuffix','sellAvailCoin'].forEach(id => setEl(id, currentBase));
  // Order book mid
  const mp = document.getElementById('obMidPrice');
  if (mp) { mp.textContent = '$' + fmt(currentPrice, currentPrice); mp.className = 'ob-mid-price ' + (isUp ? 'positive' : 'negative'); }
  const mu = document.getElementById('obMidUsd');
  if (mu) mu.textContent = fmt(currentPrice, currentPrice);
}

// ─── PAIRS LIST ─────────────────────────────────────
function renderPairsList(search = '') {
  const el = document.getElementById('pairsList'); if (!el) return;
  let list = TRADING_PAIRS.filter(p => psTab === '*' || p.quote === psTab);
  if (search) list = list.filter(p => p.pair.toLowerCase().includes(search.toLowerCase()) || p.base.toLowerCase().includes(search.toLowerCase()));
  const sorted = [...list].sort((a, b) => b.price - a.price);
  el.innerHTML = sorted.map(p => {
    const color = COIN_COLORS_T[p.base] || '#888';
    const isUp  = p.change >= 0;
    return `<div class="pair-entry ${p.base === currentBase ? 'active' : ''}" onclick="switchPair('${p.base}')">
      <div>
        <div class="pe-sym">${p.base}<span style="color:var(--t3);font-weight:400;font-size:10px">/${p.quote||'USDT'}</span></div>
        <div class="pe-sub">${p.vol || ''}</div>
      </div>
      <div class="pe-price ${isUp ? 'positive' : 'negative'}">${p.price > 100 ? p.price.toLocaleString('en-US',{maximumFractionDigits:2}) : p.price.toFixed(4)}</div>
      <div class="pe-chg ${isUp ? 'positive' : 'negative'}">${isUp ? '+' : ''}${p.change.toFixed(2)}%</div>
    </div>`;
  }).join('') || '<div style="padding:20px;text-align:center;color:var(--t3);font-size:12px">No pairs found</div>';
}

function renderPairDrop(search = '') {
  const el = document.getElementById('pairDropList'); if (!el) return;
  let list = [...TRADING_PAIRS];
  if (search) list = list.filter(p => p.pair.toLowerCase().includes(search.toLowerCase()));
  el.innerHTML = list.slice(0, 25).map(p => {
    const isUp = p.change >= 0;
    return `<div class="pair-entry" onclick="switchPair('${p.base}');closePairDrop()" style="padding:7px 12px">
      <div>
        <div style="font-size:13px;font-weight:700">${p.pair}</div>
        <div style="font-size:10px;color:var(--t3)">${p.vol || ''}</div>
      </div>
      <div class="${isUp ? 'positive' : 'negative'}" style="font-size:12px;font-weight:600;text-align:right">${p.price > 100 ? p.price.toLocaleString('en-US',{maximumFractionDigits:2}) : p.price.toFixed(4)}</div>
      <div class="${isUp ? 'positive' : 'negative'}" style="font-size:11px;text-align:right">${isUp ? '+' : ''}${p.change.toFixed(2)}%</div>
    </div>`;
  }).join('');
}

function switchPsTab(btn) {
  document.querySelectorAll('.pairs-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  psTab = btn.dataset.q === 'ALL' ? '*' : btn.dataset.q;
  renderPairsList(document.getElementById('psSearch')?.value || '');
}

function switchPairDropTab(btn) {
  document.querySelectorAll('.psq2').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  renderPairDrop(document.getElementById('pairSearch')?.value || '');
}

function togglePairDrop() {
  const d = document.getElementById('pairDrop');
  if (!d) return;
  const open = d.style.display === 'block';
  d.style.display = open ? 'none' : 'block';
  if (!open) setTimeout(() => document.getElementById('pairSearch')?.focus(), 50);
}
function closePairDrop() {
  const d = document.getElementById('pairDrop'); if (d) d.style.display = 'none';
}

function switchPair(base) {
  currentBase  = base;
  currentPair  = base + '/USDT';
  const coin   = COINS.find(c => c.id === base) || COINS[0];
  currentPrice = coin.price;
  closePairDrop();
  renderPairsList(document.getElementById('psSearch')?.value || '');
  // Stop existing polling
  if (_pollInterval) { clearInterval(_pollInterval); _pollInterval = null; }
  // Reload chart with new pair (fetches Binance + starts WS)
  loadChartData();
  renderOrderBook();
  renderRecentTradesList();
  updatePairHeader();
  updateOrderForms(getCurrentUser());
  loadOpenOrders();
  document.title = currentPair + ' | CryptoX Spot Trading';
}

// ─── ORDER FORM ──────────────────────────────────────
function updateOrderForms(user) {
  const isLoggedIn = !!user;
  // Show/hide login prompts
  ['buyLoginPrompt','sellLoginPrompt'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = isLoggedIn ? 'none' : 'block';
  });
  ['buyBtn','sellBtn'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = isLoggedIn ? 'block' : 'none';
  });

  if (!user) return;

  const usdtBal  = user.balances?.USDT?.available || 10000;
  const baseBal  = user.balances?.[currentBase]?.available || 0;
  const ba = document.getElementById('buyAvail');
  const sa = document.getElementById('sellAvail');
  if (ba) ba.innerHTML = usdtBal.toFixed(2) + ' USDT <i class="fas fa-plus-circle" style="color:var(--green);cursor:pointer;margin-left:3px" onclick="location.href=\'deposit.html\'" title="Deposit"></i>';
  if (sa) sa.innerHTML = baseBal.toFixed(6) + ' <span id="sellAvailCoin">' + currentBase + '</span>';

  const bp = document.getElementById('buyPrice');
  const sp = document.getElementById('sellPrice');
  if (buyOrderType !== 'market'  && bp) bp.value = currentPrice.toFixed(currentPrice > 100 ? 2 : 6);
  if (sellOrderType !== 'market' && sp) sp.value = currentPrice.toFixed(currentPrice > 100 ? 2 : 6);
}

function setOrderType(btn, type, side) {
  const prefix = 'ot-' + side + '-';
  document.querySelectorAll(`.ot-btn.${side}`).forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  if (side === 'buy')  buyOrderType  = type;
  if (side === 'sell') sellOrderType = type;

  const priceRow = document.getElementById(side + 'PriceRow');
  const priceInp = document.getElementById(side + 'Price');
  if (priceRow && priceInp) {
    if (type === 'market') {
      priceInp.value = '';
      priceInp.placeholder = 'Market Price';
      priceInp.readOnly = true;
      priceRow.style.opacity = '.5';
    } else {
      priceInp.readOnly = false;
      priceInp.placeholder = 'Limit Price';
      priceInp.value = currentPrice.toFixed(currentPrice > 100 ? 2 : 6);
      priceRow.style.opacity = '1';
    }
  }
}

function calcBuy() {
  const p = buyOrderType === 'market' ? currentPrice : (parseFloat(document.getElementById('buyPrice')?.value) || currentPrice);
  const a = parseFloat(document.getElementById('buyAmt')?.value) || 0;
  const total = p * a;
  const fee   = total * 0.001;
  const ti = document.getElementById('buyTotalInp');
  if (ti) ti.value = total > 0 ? total.toFixed(2) : '';
  setEl('buyFee', fee > 0 ? fee.toFixed(currentPrice > 100 ? 4 : 6) + ' USDT' : '0.00 USDT');
}

function calcBuyFromTotal() {
  const p = buyOrderType === 'market' ? currentPrice : (parseFloat(document.getElementById('buyPrice')?.value) || currentPrice);
  const t = parseFloat(document.getElementById('buyTotalInp')?.value) || 0;
  const a = p > 0 ? t / p : 0;
  const ai = document.getElementById('buyAmt');
  if (ai) ai.value = a > 0 ? a.toFixed(6) : '';
  const fee = t * 0.001;
  setEl('buyFee', fee > 0 ? fee.toFixed(4) + ' USDT' : '0.00 USDT');
}

function calcSell() {
  const p = sellOrderType === 'market' ? currentPrice : (parseFloat(document.getElementById('sellPrice')?.value) || currentPrice);
  const a = parseFloat(document.getElementById('sellAmt')?.value) || 0;
  const total = p * a;
  const fee   = total * 0.001;
  const ti = document.getElementById('sellTotalInp');
  if (ti) ti.value = total > 0 ? total.toFixed(2) : '';
  setEl('sellFee', fee > 0 ? fee.toFixed(currentPrice > 100 ? 4 : 6) + ' USDT' : '0.00 USDT');
}

function setPct(side, pct) {
  const user = getCurrentUser();
  if (!user) { showToast('Please log in to trade', 't-err'); return; }
  const price = currentPrice;
  if (side === 'buy') {
    const usdt = user.balances?.USDT?.available || 10000;
    const total = usdt * pct / 100;
    const amt   = price > 0 ? total / price : 0;
    const ai = document.getElementById('buyAmt');
    const ti = document.getElementById('buyTotalInp');
    if (ai) ai.value = amt.toFixed(6);
    if (ti) ti.value = total.toFixed(2);
    setEl('buyFee', (total * 0.001).toFixed(4) + ' USDT');
  } else {
    const bal = user.balances?.[currentBase]?.available || 0;
    const amt = bal * pct / 100;
    const ai  = document.getElementById('sellAmt');
    const ti  = document.getElementById('sellTotalInp');
    if (ai) ai.value = amt.toFixed(6);
    if (ti) ti.value = (amt * price).toFixed(2);
    setEl('sellFee', (amt * price * 0.001).toFixed(4) + ' USDT');
  }
}

async function placeOrder(side) {
  const user = getCurrentUser();
  if (!user) { showToast('Please log in to trade', 't-err'); return; }

  const orderType = side === 'buy' ? buyOrderType : sellOrderType;
  const priceEl   = document.getElementById(side + 'Price');
  const amtEl     = document.getElementById(side + 'Amt');
  const price     = orderType === 'market' ? currentPrice : (parseFloat(priceEl?.value) || 0);
  const amount    = parseFloat(amtEl?.value) || 0;

  if (price <= 0 && orderType !== 'market') { showToast('Enter a valid price', 't-err'); return; }
  if (amount <= 0) { showToast('Enter a valid amount', 't-err'); return; }

  const total = price * amount;
  const fee   = total * 0.001;

  // Try backend first
  try {
    const token = localStorage.getItem('cx_token');
    if (token) {
      const res  = await fetch('/api/trading/order', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ pair: currentPair, side, type: orderType, price, amount })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`${side === 'buy' ? '✅ Buy' : '🔴 Sell'} ${amount.toFixed(4)} ${currentBase} @ $${price.toFixed(2)}`, side === 'buy' ? 't-ok' : 't-info');
        if (amtEl) amtEl.value = '';
        const ti = document.getElementById(side + 'TotalInp');
        if (ti) ti.value = '';
        // Refresh balances
        await initAuthOnLoad();
        updateOrderForms(getCurrentUser());
        loadOpenOrders();
        return;
      } else {
        showToast(data.message || 'Order failed', 't-err');
        return;
      }
    }
  } catch(e) {}

  // Local fallback
  if (side === 'buy') {
    if ((user.balances?.USDT?.available || 0) < total * 1.001) { showToast('Insufficient USDT balance', 't-err'); return; }
    if (!user.balances) user.balances = {};
    user.balances.USDT = user.balances.USDT || { available: 10000, in_order: 0 };
    user.balances.USDT.available -= total * 1.001;
    user.balances[currentBase] = user.balances[currentBase] || { available: 0, in_order: 0 };
    user.balances[currentBase].available += amount;
  } else {
    if ((user.balances?.[currentBase]?.available || 0) < amount) { showToast('Insufficient ' + currentBase, 't-err'); return; }
    user.balances[currentBase].available -= amount;
    user.balances.USDT = user.balances.USDT || { available: 0, in_order: 0 };
    user.balances.USDT.available += total * (1 - 0.001);
  }

  const orders = JSON.parse(localStorage.getItem('cx_orders_' + user.id) || '[]');
  orders.unshift({ id: 'ORD' + Date.now(), pair: currentPair, side, type: orderType, price, amount, filled: amount, total, fee, status: 'filled', time: Date.now(), created_at: Date.now() });
  localStorage.setItem('cx_orders_' + user.id, JSON.stringify(orders));
  saveCurrentUser(user);

  showToast(`${side === 'buy' ? '✅ Buy' : '🔴 Sell'} ${amount.toFixed(4)} ${currentBase} @ $${price.toFixed(2)}`, side === 'buy' ? 't-ok' : 't-info');
  if (amtEl) amtEl.value = '';
  const ti = document.getElementById(side + 'TotalInp'); if (ti) ti.value = '';
  updateOrderForms(user);
  loadOpenOrders();
}

function setPrice(price) {
  const bp = document.getElementById('buyPrice');
  const sp = document.getElementById('sellPrice');
  if (bp && buyOrderType !== 'market')  { bp.value = price.toFixed(price > 100 ? 2 : 6); calcBuy(); }
  if (sp && sellOrderType !== 'market') { sp.value = price.toFixed(price > 100 ? 2 : 6); calcSell(); }
}

// ─── ORDER BOOK ─────────────────────────────────────
function renderOrderBook() {
  const book   = generateOrderBook(currentPrice, 14);
  const asksEl = document.getElementById('obAsks');
  const bidsEl = document.getElementById('obBids');
  if (!asksEl || !bidsEl) return;

  const maxA = Math.max(...book.asks.map(r => r.amount));
  const maxB = Math.max(...book.bids.map(r => r.amount));

  // ASKS — sorted high to low (reversed so lowest ask is near mid)
  const asksSorted = [...book.asks].sort((a, b) => b.price - a.price);
  asksEl.innerHTML = asksSorted.map(r => {
    const pct = Math.round(r.amount / maxA * 100);
    return `<div class="ob-entry" onclick="setPrice(${r.price})">
      <span class="negative" style="font-weight:600">${r.price.toFixed(r.price > 100 ? 2 : 4)}</span>
      <span style="text-align:right;color:var(--t1)">${r.amount.toFixed(4)}</span>
      <span style="text-align:right;color:var(--t2)">${r.total.toFixed(2)}</span>
      <div class="ob-depth ask" style="width:${pct}%"></div>
    </div>`;
  }).join('');

  // BIDS — sorted high to low (highest bid first)
  const bidsSorted = [...book.bids].sort((a, b) => b.price - a.price);
  bidsEl.innerHTML = bidsSorted.map(r => {
    const pct = Math.round(r.amount / maxB * 100);
    return `<div class="ob-entry" onclick="setPrice(${r.price})">
      <span class="positive" style="font-weight:600">${r.price.toFixed(r.price > 100 ? 2 : 4)}</span>
      <span style="text-align:right;color:var(--t1)">${r.amount.toFixed(4)}</span>
      <span style="text-align:right;color:var(--t2)">${r.total.toFixed(2)}</span>
      <div class="ob-depth bid" style="width:${pct}%"></div>
    </div>`;
  }).join('');

  // Mid price
  const mp = document.getElementById('obMidPrice');
  const mu = document.getElementById('obMidUsd');
  const coin = COINS.find(c => c.id === currentBase);
  const isUp = (coin?.change || 0) >= 0;
  if (mp) { mp.textContent = '$' + fmt(currentPrice, currentPrice); mp.className = 'ob-mid-price ' + (isUp ? 'positive' : 'negative'); }
  if (mu) mu.textContent = fmt(currentPrice, currentPrice);

  // Spread
  const spread = book.asks[0] && book.bids[0] ? (book.asks[0].price - book.bids[0].price).toFixed(currentPrice > 100 ? 2 : 4) : '--';
  const sp = document.getElementById('obSpreadVal');
  if (sp) sp.textContent = spread;
}

function setObLayout(layout, btn) {
  obLayout = layout;
  document.querySelectorAll('.ob-layout-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const asksWrap = document.getElementById('obAsksWrap');
  const bidsWrap = document.getElementById('obBidsWrap');
  if (asksWrap) asksWrap.style.display = layout === 'bids' ? 'none' : '';
  if (bidsWrap) bidsWrap.style.display = layout === 'asks' ? 'none' : '';
}

// ─── RECENT TRADES ───────────────────────────────────
function renderRecentTradesList() {
  const el = document.getElementById('recentTrades'); if (!el) return;
  const trades = generateRecentTrades(currentPrice, 25);
  el.innerHTML = trades.map(t => {
    const isUp = t.side === 'buy';
    return `<div class="rt-entry" onclick="setPrice(${t.price})">
      <span class="${isUp ? 'positive' : 'negative'}" style="font-weight:600">${t.price.toFixed(t.price > 100 ? 2 : 4)}</span>
      <span style="text-align:right;color:var(--t2)">${t.amount.toFixed(4)}</span>
      <span style="text-align:right;color:var(--t3)">${formatTime(t.time)}</span>
    </div>`;
  }).join('');
}

// ─── OPEN ORDERS ────────────────────────────────────
async function loadOpenOrders(tab = 'open') {
  const tbody = document.getElementById('openOrdersBody'); if (!tbody) return;
  const user  = getCurrentUser();
  const filterCurrentPair = document.getElementById('filterCurrentPair')?.checked || false;
  let orders = [];

  try {
    const token = localStorage.getItem('cx_token');
    if (token) {
      const params = new URLSearchParams({ limit: 50 });
      if (tab === 'open') params.set('status', 'open');
      const res  = await fetch('/api/trading/orders?' + params, { headers: { 'Authorization': 'Bearer ' + token } });
      const data = await res.json();
      if (data.success) orders = data.orders || [];
    }
  } catch(e) {}

  if (!orders.length) {
    orders = JSON.parse(localStorage.getItem('cx_orders_' + (user?.id || '')) || '[]');
    if (tab === 'open') orders = orders.filter(o => o.status === 'open');
    else if (tab === 'history') orders = orders.filter(o => o.status !== 'open').slice(0, 30);
    else orders = orders.slice(0, 30);
    orders = orders.reverse();
  }

  if (filterCurrentPair) orders = orders.filter(o => o.pair === currentPair);

  // Update open count badge
  const openCount = orders.filter(o => o.status === 'open').length;
  setEl('ooCount', openCount > 0 ? openCount : '0');

  if (!orders.length) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:20px;color:var(--t3);font-size:12px">
      <i class="fas fa-list" style="font-size:18px;display:block;margin-bottom:6px;opacity:.3"></i>No orders yet
    </td></tr>`;
    return;
  }

  tbody.innerHTML = orders.map(o => {
    const ts  = o.created_at || o.time || 0;
    const dt  = new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const pct = o.status === 'filled' ? 100 : (o.filled && o.amount ? Math.round(o.filled / o.amount * 100) : 0);
    return `<tr style="border-bottom:1px solid var(--border)">
      <td style="padding:7px 12px;color:var(--t3);white-space:nowrap">${dt}</td>
      <td style="padding:7px 12px;font-weight:600">${o.pair || '-'}</td>
      <td style="padding:7px 12px;text-transform:capitalize;color:var(--t2)">${o.type || 'limit'}</td>
      <td style="padding:7px 12px;font-weight:700" class="${o.side === 'buy' ? 'positive' : 'negative'}">${(o.side || '-').toUpperCase()}</td>
      <td style="padding:7px 12px;text-align:right;font-weight:600">$${parseFloat(o.price || 0).toFixed(2)}</td>
      <td style="padding:7px 12px;text-align:right">${parseFloat(o.amount || 0).toFixed(6)}</td>
      <td style="padding:7px 12px;text-align:right">
        <div style="display:flex;align-items:center;gap:4px;justify-content:flex-end">
          <div style="width:40px;height:3px;background:var(--bg4);border-radius:2px;overflow:hidden">
            <div style="width:${pct}%;height:100%;background:${o.side==='buy'?'var(--green)':'var(--red)'};border-radius:2px"></div>
          </div>
          <span style="color:var(--t2)">${pct}%</span>
        </div>
      </td>
      <td style="padding:7px 12px;text-align:right;font-weight:600">$${parseFloat(o.total || 0).toFixed(2)}</td>
      <td style="padding:7px 12px">
        <span style="display:inline-block;padding:2px 7px;border-radius:3px;font-size:10px;font-weight:600;
          background:${o.status==='filled'?'var(--green-dim)':o.status==='open'?'rgba(59,130,246,.15)':'var(--bg4)'};
          color:${o.status==='filled'?'var(--green)':o.status==='open'?'#60a5fa':'var(--t3)'}">
          ${o.status || '-'}
        </span>
      </td>
      <td style="padding:7px 12px">
        ${o.status === 'open' ? `<button style="background:none;border:1px solid var(--border);border-radius:3px;padding:2px 8px;font-size:11px;color:var(--red);cursor:pointer" onmouseover="this.style.borderColor='var(--red)'" onmouseout="this.style.borderColor='var(--border)'" onclick="cancelOrder('${o.id}')">Cancel</button>` : '-'}
      </td>
    </tr>`;
  }).join('');
}

function switchOoTab(btn) {
  document.querySelectorAll('.oo-t').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  loadOpenOrders(btn.dataset.oo);
}

async function cancelOrder(id) {
  try {
    const token = localStorage.getItem('cx_token');
    if (token) {
      const res  = await fetch('/api/trading/order/' + id, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token } });
      const data = await res.json();
      if (data.success) { showToast('Order cancelled', 't-info'); loadOpenOrders(); return; }
    }
  } catch(e) {}
  const user = getCurrentUser();
  if (user) {
    const orders = JSON.parse(localStorage.getItem('cx_orders_' + user.id) || '[]');
    const o = orders.find(x => x.id === id); if (o) o.status = 'cancelled';
    localStorage.setItem('cx_orders_' + user.id, JSON.stringify(orders));
  }
  showToast('Order cancelled', 't-info');
  loadOpenOrders();
}

// ─── LIVE UPDATES ────────────────────────────────────
function startLiveUpdates() {
  // Price updates now handled by Binance WebSocket (started in loadChartData)
  // Keep only order book + trades simulation, and pairs list update

  // Order book — every 1.5s (simulated depth)
  obTimer = setInterval(renderOrderBook, 1500);

  // Recent trades — every 2.5s (simulated)
  tradeTimer = setInterval(renderRecentTradesList, 2500);

  // Pairs list — every 3s (only update non-current pairs with micro fluctuation)
  setInterval(() => {
    COINS.forEach(c => {
      if (c.id === currentBase) return; // current pair handled by Binance WS
      c.price  = parseFloat((c.price  * (1 + (Math.random() - 0.5) * 0.0004)).toFixed(c.price > 100 ? 2 : 6));
      c.change = parseFloat((c.change + (Math.random() - 0.5) * 0.02).toFixed(2));
      const tp = TRADING_PAIRS.find(p => p.base === c.id);
      if (tp) { tp.price = c.price; tp.change = c.change; }
    });
    renderPairsList(document.getElementById('psSearch')?.value || '');
  }, 3000);
}

// ─── MISC HELPERS ────────────────────────────────────
function fmt(price, ref) {
  if (ref === undefined) ref = price;
  if (ref >= 10000)  return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (ref >= 1000)   return price.toFixed(2);
  if (ref >= 1)      return price.toFixed(4);
  return price.toFixed(6);
}

function formatTime(ms) {
  return new Date(ms).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

function setEl(id, val, className) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = val;
  if (className) el.className = className;
}

function toggleSettings() {
  showToast('Settings panel coming soon', 't-info');
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen();
  }
}

function showToast(msg, type = 't-info') {
  let c = document.getElementById('toastContainer');
  if (!c) { c = document.createElement('div'); c.id = 'toastContainer'; c.className = 'toast-container'; document.body.appendChild(c); }
  const icons = { 't-ok': 'fa-check-circle', 't-err': 'fa-times-circle', 't-warn': 'fa-exclamation-triangle', 't-info': 'fa-info-circle' };
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.innerHTML = `<i class="toast-icon fas ${icons[type] || 'fa-info-circle'}"></i><span class="toast-msg">${msg}</span>`;
  c.appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 3200);
}
window.showToast = showToast;
