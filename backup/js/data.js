// ============================================
// CRYPTOX - DATA & MARKET DATA
// ============================================

const COINS = [
  { id:'BTC',  name:'Bitcoin',       color:'#F7931A', price:67450.00, change:2.34,  vol:'$28.5B',  mcap:'$1.32T',  rank:1  },
  { id:'ETH',  name:'Ethereum',      color:'#627EEA', price:3842.50,  change:1.87,  vol:'$14.2B',  mcap:'$462B',   rank:2  },
  { id:'BNB',  name:'BNB',           color:'#F0B90B', price:605.30,   change:-0.54, vol:'$2.1B',   mcap:'$88B',    rank:3  },
  { id:'SOL',  name:'Solana',        color:'#9945FF', price:185.40,   change:4.21,  vol:'$5.3B',   mcap:'$85B',    rank:4  },
  { id:'XRP',  name:'Ripple',        color:'#00AAE4', price:0.6234,   change:-1.23, vol:'$3.8B',   mcap:'$35B',    rank:5  },
  { id:'ADA',  name:'Cardano',       color:'#0D1E2D', price:0.4521,   change:3.12,  vol:'$0.8B',   mcap:'$16B',    rank:6  },
  { id:'AVAX', name:'Avalanche',     color:'#E84142', price:38.75,    change:5.67,  vol:'$0.9B',   mcap:'$16B',    rank:7  },
  { id:'DOGE', name:'Dogecoin',      color:'#C2A633', price:0.1523,   change:-2.10, vol:'$1.2B',   mcap:'$22B',    rank:8  },
  { id:'DOT',  name:'Polkadot',      color:'#E6007A', price:7.85,     change:1.45,  vol:'$0.4B',   mcap:'$10B',    rank:9  },
  { id:'MATIC',name:'Polygon',       color:'#8247E5', price:0.8921,   change:2.88,  vol:'$0.5B',   mcap:'$8.7B',   rank:10 },
  { id:'LINK', name:'Chainlink',     color:'#2A5ADA', price:14.23,    change:3.45,  vol:'$0.7B',   mcap:'$8.4B',   rank:11 },
  { id:'UNI',  name:'Uniswap',       color:'#FF007A', price:8.56,     change:-0.78, vol:'$0.3B',   mcap:'$5.1B',   rank:12 },
  { id:'LTC',  name:'Litecoin',      color:'#BFBBBB', price:88.40,    change:0.92,  vol:'$0.6B',   mcap:'$6.6B',   rank:13 },
  { id:'ATOM', name:'Cosmos',        color:'#6F7390', price:9.12,     change:2.34,  vol:'$0.3B',   mcap:'$3.5B',   rank:14 },
  { id:'XLM',  name:'Stellar',       color:'#14B6E7', price:0.1142,   change:1.56,  vol:'$0.2B',   mcap:'$3.2B',   rank:15 },
  { id:'TRX',  name:'TRON',          color:'#FF0013', price:0.1234,   change:-0.34, vol:'$0.9B',   mcap:'$10.8B',  rank:16 },
  { id:'ETC',  name:'Ethereum Classic',color:'#328332',price:27.80,  change:1.23,  vol:'$0.2B',   mcap:'$4.0B',   rank:17 },
  { id:'FIL',  name:'Filecoin',      color:'#0090FF', price:5.67,     change:-1.89, vol:'$0.2B',   mcap:'$3.0B',   rank:18 },
  { id:'NEAR', name:'NEAR Protocol', color:'#000000', price:5.23,     change:6.78,  vol:'$0.5B',   mcap:'$5.7B',   rank:19 },
  { id:'ARB',  name:'Arbitrum',      color:'#28A0F0', price:1.12,     change:3.45,  vol:'$0.4B',   mcap:'$3.2B',   rank:20 },
];

const TRADING_PAIRS = COINS.map(c => ({
  pair:    c.id + '/USDT',
  base:    c.id,
  quote:   'USDT',
  price:   c.price,
  change:  c.change,
  vol:     c.vol,
  high:    parseFloat((c.price * 1.035).toFixed(c.price > 100 ? 2 : 6)),
  low:     parseFloat((c.price * 0.965).toFixed(c.price > 100 ? 2 : 6)),
}));

// Simulate live price fluctuations
function getLivePrice(base) {
  const coin = COINS.find(c => c.id === base);
  if (!coin) return 0;
  const fluctuation = (Math.random() - 0.5) * 0.002; // ±0.1%
  return parseFloat((coin.price * (1 + fluctuation)).toFixed(coin.price > 100 ? 2 : 6));
}

function formatPrice(price) {
  if (price >= 1000) return '$' + price.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2});
  if (price >= 1)    return '$' + price.toFixed(4);
  return '$' + price.toFixed(6);
}

function formatVolume(vol) {
  if (typeof vol === 'string') return vol;
  if (vol >= 1e9) return '$' + (vol/1e9).toFixed(1) + 'B';
  if (vol >= 1e6) return '$' + (vol/1e6).toFixed(1) + 'M';
  return '$' + vol.toLocaleString();
}

function formatNumber(n, decimals=2) {
  return parseFloat(n).toLocaleString('en-US', {minimumFractionDigits:decimals, maximumFractionDigits:decimals});
}

function timeSince(ms) {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60)  return s + 's ago';
  if (s < 3600) return Math.floor(s/60) + 'm ago';
  if (s < 86400) return Math.floor(s/3600) + 'h ago';
  return Math.floor(s/86400) + 'd ago';
}

function formatTime(ms) {
  return new Date(ms).toLocaleTimeString('en-US', {hour12:false});
}

function formatDateTime(ms) {
  return new Date(ms).toLocaleString('en-US', {year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
}

// Generate random order book data
function generateOrderBook(basePrice, levels=15) {
  const asks = [], bids = [];
  let ap = basePrice * 1.0001;
  let bp = basePrice * 0.9999;
  for (let i = 0; i < levels; i++) {
    const aAmt = parseFloat((Math.random() * 2 + 0.01).toFixed(4));
    const bAmt = parseFloat((Math.random() * 2 + 0.01).toFixed(4));
    asks.push({ price: parseFloat(ap.toFixed(2)), amount: aAmt, total: parseFloat((ap * aAmt).toFixed(2)) });
    bids.push({ price: parseFloat(bp.toFixed(2)), amount: bAmt, total: parseFloat((bp * bAmt).toFixed(2)) });
    ap *= 1.0003;
    bp *= 0.9997;
  }
  return { asks: asks.sort((a,b) => a.price - b.price), bids: bids.sort((a,b) => b.price - a.price) };
}

// Generate recent trades
function generateRecentTrades(basePrice, count=30) {
  const trades = [];
  for (let i = 0; i < count; i++) {
    const side = Math.random() > 0.5 ? 'buy' : 'sell';
    const p = parseFloat((basePrice * (1 + (Math.random()-0.5)*0.002)).toFixed(2));
    const a = parseFloat((Math.random() * 1.5 + 0.001).toFixed(4));
    trades.push({ price: p, amount: a, side, time: Date.now() - i * 3000 });
  }
  return trades;
}

// Generate candlestick data
function generateCandles(basePrice, count=100) {
  const candles = [];
  let price = basePrice * 0.9;
  for (let i = 0; i < count; i++) {
    const open  = price;
    const close = parseFloat((open * (1 + (Math.random()-0.48)*0.015)).toFixed(2));
    const high  = parseFloat((Math.max(open,close) * (1 + Math.random()*0.008)).toFixed(2));
    const low   = parseFloat((Math.min(open,close) * (1 - Math.random()*0.008)).toFixed(2));
    const vol   = parseFloat((Math.random() * 500 + 50).toFixed(2));
    candles.push({ open, high, low, close, vol, time: Date.now() - (count-i)*15*60*1000 });
    price = close;
  }
  return candles;
}

// Default user balances
function getDefaultBalances() {
  return {
    USDT:  { available: 10000, inOrder: 0 },
    BTC:   { available: 0.05,  inOrder: 0 },
    ETH:   { available: 1.5,   inOrder: 0 },
    BNB:   { available: 5.0,   inOrder: 0 },
    SOL:   { available: 10.0,  inOrder: 0 },
    XRP:   { available: 500,   inOrder: 0 },
    ADA:   { available: 1000,  inOrder: 0 },
    AVAX:  { available: 20,    inOrder: 0 },
    DOGE:  { available: 5000,  inOrder: 0 },
  };
}

// Generate random TxID
function randomTxId() {
  return '0x' + Array.from({length:32}, ()=>'0123456789abcdef'[Math.floor(Math.random()*16)]).join('');
}
