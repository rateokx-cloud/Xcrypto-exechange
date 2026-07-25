// ============================================
// WEBSOCKET SERVER - Real-time price feeds
// ============================================
const WebSocket = require('ws');
const { priceEngine } = require('./priceEngine');

function setupWebSocket(server) {
  const wss = new WebSocket.Server({ server, path: '/ws' });

  // Store subscriptions per client
  const clients = new Map(); // ws -> Set of subscribed pairs

  wss.on('connection', (ws, req) => {
    clients.set(ws, new Set());
    ws.isAlive = true;

    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());

        if (msg.type === 'subscribe') {
          // Subscribe to pair(s)
          const pairs = Array.isArray(msg.pairs) ? msg.pairs : [msg.pair];
          const subs  = clients.get(ws);
          pairs.forEach(p => {
            if (p) subs.add(p.toUpperCase().replace('-','/'));
          });
          ws.send(JSON.stringify({ type: 'subscribed', pairs: Array.from(subs) }));
        }

        else if (msg.type === 'unsubscribe') {
          const subs = clients.get(ws);
          const pairs = Array.isArray(msg.pairs) ? msg.pairs : [msg.pair];
          pairs.forEach(p => subs.delete(p.toUpperCase().replace('-','/')));
          ws.send(JSON.stringify({ type: 'unsubscribed', pairs: Array.from(subs) }));
        }

        else if (msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', time: Date.now() }));
        }

        else if (msg.type === 'get_ticker') {
          const pair = (msg.pair || '').toUpperCase().replace('-','/');
          const tick = priceEngine.getPrice(pair);
          if (tick) ws.send(JSON.stringify({ type: 'ticker', pair, ...tick }));
        }

        else if (msg.type === 'get_orderbook') {
          const pair   = (msg.pair || '').toUpperCase().replace('-','/');
          const levels = msg.levels || 15;
          const book   = priceEngine.getOrderBook(pair, levels);
          ws.send(JSON.stringify({ type: 'orderbook', pair, ...book }));
        }

      } catch (err) {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
      }
    });

    ws.on('close', () => { clients.delete(ws); });
    ws.on('error', () => { clients.delete(ws); });

    // Send initial connection message
    ws.send(JSON.stringify({ type: 'connected', message: 'CryptoX WebSocket connected', time: Date.now() }));
  });

  // Broadcast ticker updates every 500ms
  setInterval(() => {
    if (wss.clients.size === 0) return;
    const prices = priceEngine.getAllPrices();
    wss.clients.forEach(ws => {
      if (ws.readyState !== WebSocket.OPEN) return;
      const subs = clients.get(ws);
      if (!subs || subs.size === 0) {
        // Send all tickers to unsubscribed clients
        ws.send(JSON.stringify({ type: 'tickers', data: prices }));
        return;
      }
      // Send only subscribed pairs
      const data = {};
      subs.forEach(pair => { if (prices[pair]) data[pair] = prices[pair]; });
      if (Object.keys(data).length > 0) {
        ws.send(JSON.stringify({ type: 'tickers', data }));
      }
    });
  }, 500);

  // Broadcast order book updates every 1.5s
  setInterval(() => {
    if (wss.clients.size === 0) return;
    wss.clients.forEach(ws => {
      if (ws.readyState !== WebSocket.OPEN) return;
      const subs = clients.get(ws);
      if (!subs) return;
      subs.forEach(pair => {
        const book = priceEngine.getOrderBook(pair, 12);
        ws.send(JSON.stringify({ type: 'orderbook', pair, ...book }));
      });
    });
  }, 1500);

  // Broadcast recent trades every 2s
  setInterval(() => {
    if (wss.clients.size === 0) return;
    wss.clients.forEach(ws => {
      if (ws.readyState !== WebSocket.OPEN) return;
      const subs = clients.get(ws);
      if (!subs) return;
      subs.forEach(pair => {
        const trades = priceEngine.getRecentTrades(pair, 15);
        ws.send(JSON.stringify({ type: 'trades', pair, trades }));
      });
    });
  }, 2000);

  // Heartbeat - ping all clients every 30s
  setInterval(() => {
    wss.clients.forEach(ws => {
      if (ws.isAlive === false) { ws.terminate(); return; }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  console.log('✅ WebSocket server ready at /ws');
  return wss;
}

module.exports = { setupWebSocket };
