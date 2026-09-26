const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// TradingView Forex Pairs Mapping
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

// Fetch TradingView Direct Data Feed
async function fetchTradingViewDirectCandles(pairStr, count = 3000) {
  const cleanPair = pairStr.toUpperCase().trim();
  const tvSymbol = PAIR_MAP[cleanPair] || 'FX:USDJPY';
  
  // TradingView Scanner Provider API
  const url = `https://benchmarks.tradingview.com/v1/data?symbol=${tvSymbol}&resolution=1&from=${Math.floor(Date.now()/1000) - 259200}&to=${Math.floor(Date.now()/1000)}`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Origin': 'https://www.tradingview.com',
        'Referer': 'https://www.tradingview.com/'
      }
    });

    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
    const rawData = await response.json();

    let candles = [];
    if (rawData && rawData.t) {
      for (let i = 0; i < rawData.t.length; i++) {
        const open = parseFloat(rawData.o[i]);
        const high = parseFloat(rawData.h[i]);
        const low = parseFloat(rawData.l[i]);
        const close = parseFloat(rawData.c[i]);
        const timestamp = rawData.t[i];

        candles.push({
          close: close,
          high: high,
          low: low,
          open: open,
          pair: cleanPair,
          signal: close >= open ? "CALL" : "PUT",
          time: formatTimeUTC6(timestamp * 1000),
          timestamp: timestamp,
          volume: rawData.v ? rawData.v[i] : 0
        });
      }
    }

    return candles.slice(-count).reverse();
  } catch (err) {
    console.error("TradingView Direct API Error:", err.message);
    return [];
  }
}

// JSON API Route
app.get('/api/candles', async (req, res) => {
  const pair = req.query.pair || 'USD/JPY';
  const candles = await fetchTradingViewDirectCandles(pair, 3000);
  const marketStatus = isMarketOpen() ? "MARKET OPEN" : "MARKET CLOSED";

  res.json({
    status: marketStatus,
    total_candles: candles.length,
    data: candles
  });
});

// Chart Route
app.get('/chart', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'chart.html'));
});

app.listen(PORT, () => {
  console.log(`TradingView Real Forex Engine active on port ${PORT}`);
});
