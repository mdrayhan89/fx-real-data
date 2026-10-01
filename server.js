const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

const PAIR_MAP = {
  'EUR/USD': 'FX:EURUSD', 'EURUSD': 'FX:EURUSD',
  'USD/JPY': 'FX:USDJPY', 'USDJPY': 'FX:USDJPY',
  'CAD/JPY': 'FX:CADJPY', 'CADJPY': 'FX:CADJPY',
  'AUD/CAD': 'FX:AUDCAD', 'AUDCAD': 'FX:AUDCAD',
  'GBP/USD': 'FX:GBPUSD', 'GBPUSD': 'FX:GBPUSD',
  'EUR/JPY': 'FX:EURJPY', 'EURJPY': 'FX:EURJPY',
  'AUD/JPY': 'FX:AUDJPY', 'AUDJPY': 'FX:AUDJPY',
  'AUD/USD': 'FX:AUDUSD', 'AUDUSD': 'FX:AUDUSD',
  'EUR/GBP': 'FX:EURGBP', 'EURGBP': 'FX:EURGBP',
  'AUD/CHF': 'FX:AUDCHF', 'AUDCHF': 'FX:AUDCHF',
  'EUR/CAD': 'FX:EURCAD', 'EURCAD': 'FX:EURCAD',
  'GBP/CAD': 'FX:GBPCAD', 'GBPCAD': 'FX:GBPCAD'
};

function formatTimeUTC6(timestampMs) {
  const date = new Date(timestampMs + (6 * 60 * 60 * 1000));
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

function isMarketOpen() {
  const now = new Date();
  const day = now.getUTCDay();
  const hour = now.getUTCHours();
  if (day === 6) return false;
  if (day === 5 && hour >= 21) return false;
  if (day === 0 && hour < 21) return false;
  return true;
}

// Bot & Chart-er jonno Direct Sync Engine
async function fetchTradingViewBotCandles(pairStr) {
  const cleanPair = pairStr.toUpperCase().trim();
  const symbol = PAIR_MAP[cleanPair] || 'FX:USDJPY';
  
  const now = Math.floor(Date.now() / 1000);
  const from = now - (500 * 60);

  // TradingView Direct WebSocket Gateway Bypass
  const tvUrl = `https://benchmarks.tradingview.com/v1/data?symbol=${encodeURIComponent(symbol)}&resolution=1&from=${from}&to=${now}`;

  try {
    const response = await fetch(tvUrl, {
      headers: {
        'Origin': 'https://www.tradingview.com',
        'Referer': 'https://www.tradingview.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (response.ok) {
      const json = await response.json();
      if (json && json.t && json.t.length > 0) {
        let candles = [];
        for (let i = 0; i < json.t.length; i++) {
          const open = parseFloat(json.o[i]);
          const high = parseFloat(json.h[i]);
          const low = parseFloat(json.l[i]);
          const close = parseFloat(json.c[i]);
          const ts = json.t[i];

          candles.push({
            close: close,
            high: high,
            low: low,
            open: open,
            pair: cleanPair,
            signal: close >= open ? "CALL" : "PUT",
            time: formatTimeUTC6(ts * 1000),
            timestamp: ts,
            volume: json.v ? json.v[i] : 0
          });
        }
        return candles.reverse();
      }
    }
  } catch (err) {}

  return [];
}

// Bot Execution Endpoint
app.get('/api/candles', async (req, res) => {
  const pair = req.query.pair || 'USD/JPY';
  const candles = await fetchTradingViewBotCandles(pair);
  const status = isMarketOpen() ? "MARKET OPEN" : "MARKET CLOSED";

  res.json({
    status: status,
    total_candles: candles.length,
    data: candles
  });
});

app.get('/chart', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'chart.html'));
});

app.listen(PORT, () => {
  console.log(`DARK SECRET Trading Engine running on port ${PORT}`);
});
