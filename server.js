const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Supported Forex Pairs
const PAIR_MAP = {
  'EUR/USD': 'EURUSD', 'EURUSD': 'EURUSD',
  'USD/JPY': 'USDJPY', 'USDJPY': 'USDJPY',
  'CAD/JPY': 'CADJPY', 'CADJPY': 'CADJPY',
  'AUD/CAD': 'AUDCAD', 'AUDCAD': 'AUDCAD',
  'GBP/USD': 'GBPUSD', 'GBPUSD': 'GBPUSD',
  'EUR/JPY': 'EURJPY', 'EURJPY': 'EURJPY',
  'AUD/JPY': 'AUDJPY', 'AUDJPY': 'AUDJPY',
  'AUD/USD': 'AUDUSD', 'AUDUSD': 'AUDUSD',
  'EUR/GBP': 'EURGBP', 'EURGBP': 'EURGBP',
  'AUD/CHF': 'AUDCHF', 'AUDCHF': 'AUDCHF',
  'EUR/CAD': 'EURCAD', 'EURCAD': 'EURCAD',
  'GBP/CAD': 'GBPCAD', 'GBPCAD': 'GBPCAD'
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
  if (day === 6) return false; // Sat
  if (day === 5 && hour >= 21) return false; // Fri night
  if (day === 0 && hour < 21) return false; // Sun morning
  return true;
}

// Direct TradingView Real Forex Data Fetcher
async function fetchTradingViewForexCandles(pairStr, count = 3000) {
  const cleanPair = pairStr.toUpperCase().trim();
  const symbol = PAIR_MAP[cleanPair] || 'USDJPY';
  
  // TradingView Data Feed Provider Endpoint
  const tvUrl = `https://chartdata.tradingview.com/data?symbol=FX_IDC%3A${symbol}&resolution=1&from=${Math.floor(Date.now()/1000) - (count * 60)}&to=${Math.floor(Date.now()/1000)}`;

  try {
    const res = await fetch(tvUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Referer': 'https://www.tradingview.com/'
      }
    });

    if (!res.ok) throw new Error("TV Feed Fetch Error");
    const json = await res.json();

    let candles = [];
    if (json && json.t) {
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
    }
    return candles.reverse();
  } catch (err) {
    // Fallback direct provider fetch
    return fetchFallbackForex(symbol, count, cleanPair);
  }
}

async function fetchFallbackForex(symbol, count, cleanPair) {
  try {
    const url = `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=1min&outputsize=${count}&apikey=demo`;
    const res = await fetch(url);
    const json = await res.json();
    if (!json.values) return [];
    
    return json.values.map(item => {
      const open = parseFloat(item.open);
      const close = parseFloat(item.close);
      const ts = Math.floor(new Date(item.datetime).getTime() / 1000);
      return {
        close: close,
        high: parseFloat(item.high),
        low: parseFloat(item.low),
        open: open,
        pair: cleanPair,
        signal: close >= open ? "CALL" : "PUT",
        time: formatTimeUTC6(ts * 1000),
        timestamp: ts,
        volume: 0
      };
    });
  } catch (e) {
    return [];
  }
}

// Option 1: Live JSON API
app.get('/api/candles', async (req, res) => {
  const pair = req.query.pair || 'USD/JPY';
  const candles = await fetchTradingViewForexCandles(pair, 3000);
  const status = isMarketOpen() ? "MARKET OPEN" : "MARKET CLOSED";

  res.json({
    status: status,
    total_candles: candles.length,
    data: candles
  });
});

// Option 2: Own Visual Custom Canvas
app.get('/chart', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'chart.html'));
});

app.listen(PORT, () => {
  console.log(`DARK SECRET Own Engine running on port ${PORT}`);
});
