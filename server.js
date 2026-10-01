const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

const PAIR_MAP = {
  'EUR/USD': 'FX_IDC:EURUSD', 'EURUSD': 'FX_IDC:EURUSD',
  'USD/JPY': 'FX_IDC:USDJPY', 'USDJPY': 'FX_IDC:USDJPY',
  'CAD/JPY': 'FX_IDC:CADJPY', 'CADJPY': 'FX_IDC:CADJPY',
  'AUD/CAD': 'FX_IDC:AUDCAD', 'AUDCAD': 'FX_IDC:AUDCAD',
  'GBP/USD': 'FX_IDC:GBPUSD', 'GBPUSD': 'FX_IDC:GBPUSD',
  'EUR/JPY': 'FX_IDC:EURJPY', 'EURJPY': 'FX_IDC:EURJPY',
  'AUD/JPY': 'FX_IDC:AUDJPY', 'AUDJPY': 'FX_IDC:AUDJPY',
  'AUD/USD': 'FX_IDC:AUDUSD', 'AUDUSD': 'FX_IDC:AUDUSD',
  'EUR/GBP': 'FX_IDC:EURGBP', 'EURGBP': 'FX_IDC:EURGBP',
  'AUD/CHF': 'FX_IDC:AUDCHF', 'AUDCHF': 'FX_IDC:AUDCHF',
  'EUR/CAD': 'FX_IDC:EURCAD', 'EURCAD': 'FX_IDC:EURCAD',
  'GBP/CAD': 'FX_IDC:GBPCAD', 'GBPCAD': 'FX_IDC:GBPCAD'
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

async function fetchTradingViewDirectCandles(pairStr) {
  const cleanPair = pairStr.toUpperCase().trim();
  const tvSymbol = PAIR_MAP[cleanPair] || 'FX_IDC:USDJPY';
  
  const now = Math.floor(Date.now() / 1000);
  const from = now - (500 * 60);
  const url = `https://udf.tradingview.com/history?symbol=${tvSymbol}&resolution=1&from=${from}&to=${now}`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.tradingview.com'
      }
    });

    if (!response.ok) throw new Error("TV UDF Fetch Error");
    const json = await response.json();

    if (json.s === "ok" && json.t && json.t.length > 0) {
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
  } catch (err) {
    console.error("Direct TV UDF error, fallback engaged");
  }

  return [];
}

app.get('/api/candles', async (req, res) => {
  const pair = req.query.pair || 'USD/JPY';
  const candles = await fetchTradingViewDirectCandles(pair);
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
  console.log(`DARK SECRET TradingView-Synced Server running on port ${PORT}`);
});
