// ============================================
// PRICE ENGINE - Simulates live market data
// ============================================

const BASE_PRICES = {
  'BTC/USDT': 67450, 'ETH/USDT': 3842, 'BNB/USDT': 605,
  'SOL/USDT': 185,   'XRP/USDT': 0.623,'ADA/USDT': 0.452,
  'DOGE/USDT':0.152, 'AVAX/USDT':38.7, 'DOT/USDT': 7.85,
  'MATIC/USDT':0.892,'LINK/USDT':14.2, 'LTC/USDT': 88.4,
  'NEAR/USDT': 5.23, 'ARB/USDT':  1.12,'TRX/USDT': 0.123,
  'ETH/BTC':   0.057,'BNB/BTC':   0.009,'SOL/BTC': 0.0027,
  'ETH/BNB':   6.35,
};

class PriceEngine {
  constructor() {
    this.prices = {};
    this.history = {};    // pair -> array of {time, price}
    this.klines  = {};    // pair:interval -> array of candles
    this.recentTrades = {};
    this._init();
    this._startUpdates();
  }

  _init() {
    Object.keys(BASE_PRICES).forEach(pair => {
      const p = BASE_PRICES[pair];
      const change = (Math.random() - 0.48) * 4;
      this.prices[pair] = {
        price:   parseFloat((p * (1 + change/100)).toFixed(p > 100 ? 2 : 6)),
        open:    parseFloat((p * 0.995).toFixed(p > 100 ? 2 : 6)),
        high:    parseFloat((p * 1.035).toFixed(p > 100 ? 2 : 6)),
        low:     parseFloat((p * 0.965).toFixed(p > 100 ? 2 : 6)),
        change:  parseFloat(change.toFixed(2)),
        change_pct: parseFloat(change.toFixed(2)),
        volume:  parseFloat((Math.random() * 5000 + 100).toFixed(2)),
        volume_quote: parseFloat((Math.random() * 500000000 + 1000000).toFixed(0)),
        updated_at: Date.now(),
      };
      this.recentTrades[pair] = this._genTrades(pair, 30);
      ['1m','5m','15m','1h','4h','1d','1w'].forEach(i => {
        this.klines[`${pair}:${i}`] = this._genKlines(pair, i, 200);
      });
    });
  }

  _genTrades(pair, count) {
    const p = this.prices[pair]?.price || 1;
    const trades = [];
    for (let i = 0; i < count; i++) {
      const side  = Math.random() > 0.5 ? 'buy' : 'sell';
      const price = parseFloat((p * (1 + (Math.random()-0.5)*0.002)).toFixed(p>100?2:6));
      const amount= parseFloat((Math.random() * 2 + 0.001).toFixed(6));
      trades.push({ price, amount, side, time: Date.now() - i * 3000 });
    }
    return trades;
  }

  _genKlines(pair, interval, count) {
    const p = BASE_PRICES[pair] || 1;
    const ms = { '1m':60000,'5m':300000,'15m':900000,'1h':3600000,'4h':14400000,'1d':86400000,'1w':604800000 }[interval] || 900000;
    const candles = [];
    let price = p * 0.92;
    for (let i = 0; i < count; i++) {
      const open  = price;
      const close = parseFloat((open * (1 + (Math.random()-0.48)*0.015)).toFixed(p>100?2:6));
      const high  = parseFloat((Math.max(open,close) * (1 + Math.random()*0.008)).toFixed(p>100?2:6));
      const low   = parseFloat((Math.min(open,close) * (1 - Math.random()*0.008)).toFixed(p>100?2:6));
      const vol   = parseFloat((Math.random()*500+10).toFixed(4));
      candles.push({ time: Date.now() - (count-i)*ms, open, high, low, close, volume: vol });
      price = close;
    }
    return candles;
  }

  _startUpdates() {
    // Update prices every 500ms
    setInterval(() => {
      Object.keys(this.prices).forEach(pair => {
        const tick = this.prices[pair];
        const fluctuation = (Math.random() - 0.5) * 0.0008;
        tick.price = parseFloat((tick.price * (1 + fluctuation)).toFixed(tick.price > 100 ? 2 : 6));
        if (tick.price > tick.high) tick.high = tick.price;
        if (tick.price < tick.low)  tick.low  = tick.price;
        tick.change_pct = parseFloat(((tick.price - tick.open) / tick.open * 100).toFixed(2));
        tick.updated_at = Date.now();

        // Add new recent trade
        const side  = Math.random() > 0.5 ? 'buy' : 'sell';
        const amount= parseFloat((Math.random()*1.5+0.001).toFixed(4));
        this.recentTrades[pair].unshift({ price: tick.price, amount, side, time: Date.now() });
        if (this.recentTrades[pair].length > 50) this.recentTrades[pair].pop();

        // Update last candle
        ['1m','5m','15m','1h','4h','1d'].forEach(interval => {
          const key = `${pair}:${interval}`;
          const kl  = this.klines[key];
          if (kl && kl.length > 0) {
            const last = kl[kl.length - 1];
            last.close = tick.price;
            if (tick.price > last.high) last.high = tick.price;
            if (tick.price < last.low)  last.low  = tick.price;
            last.volume += amount;
          }
        });
      });
    }, 500);

    // Add new candle every minute for 1m interval
    setInterval(() => {
      Object.keys(this.prices).forEach(pair => {
        const tick = this.prices[pair];
        const key  = `${pair}:1m`;
        const kl   = this.klines[key];
        if (kl) {
          kl.push({ time: Date.now(), open: tick.price, high: tick.price, low: tick.price, close: tick.price, volume: 0 });
          if (kl.length > 500) kl.shift();
        }
      });
    }, 60000);
  }

  getPrice(pair) {
    return this.prices[pair.toUpperCase()] || null;
  }

  getAllPrices() {
    return this.prices;
  }

  getOrderBook(pair, levels = 15) {
    const tick = this.prices[pair.toUpperCase()];
    if (!tick) return { asks: [], bids: [] };
    const p = tick.price;
    const asks = [], bids = [];
    let ap = p * 1.0001, bp = p * 0.9999;
    for (let i = 0; i < levels; i++) {
      const aAmt = parseFloat((Math.random()*2+0.01).toFixed(4));
      const bAmt = parseFloat((Math.random()*2+0.01).toFixed(4));
      asks.push({ price: parseFloat(ap.toFixed(p>100?2:6)), amount: aAmt, total: parseFloat((ap*aAmt).toFixed(2)) });
      bids.push({ price: parseFloat(bp.toFixed(p>100?2:6)), amount: bAmt, total: parseFloat((bp*bAmt).toFixed(2)) });
      ap *= 1.0003;
      bp *= 0.9997;
    }
    return {
      asks: asks.sort((a,b) => a.price - b.price),
      bids: bids.sort((a,b) => b.price - a.price),
      spread: parseFloat((asks[0].price - bids[0].price).toFixed(p>100?2:6)),
      mid_price: tick.price
    };
  }

  getRecentTrades(pair, limit = 30) {
    const trades = this.recentTrades[pair.toUpperCase()] || [];
    return trades.slice(0, limit);
  }

  getKlines(pair, interval, limit = 100) {
    const key = `${pair.toUpperCase()}:${interval}`;
    const kl  = this.klines[key] || [];
    return kl.slice(-limit);
  }
}

const priceEngine = new PriceEngine();
module.exports = { priceEngine };
