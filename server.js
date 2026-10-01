const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Standard Forex Pair Mapping
const PAIR_MAP = {
  'EUR/USD': 'EUR/USD', 'EURUSD': 'EUR/USD',
  'USD/JPY': 'USD/JPY', 'USDJPY': 'USD/JPY',
  'CAD/JPY': 'CAD/JPY', 'CADJPY': 'CAD/JPY',
  'AUD/CAD': 'AUD/CAD', 'AUDCAD': 'AUD/CAD',
  'GBP/USD': 'GBP/USD', 'GBPUSD': 'GBP/USD',
  'EUR/JPY': 'EUR/JPY', 'EURJPY': 'EUR/JPY',
  'AUD/JPY': 'AUD/JPY', 'AUDJPY': 'AUD/JPY',
  'AUD/USD': 'AUD/USD', 'AUDUSD': 'AUD/USD',
  'EUR/GBP': 'EUR/GBP', 'EURGBP': 'EUR/GBP',
  'AUD/CHF': 'AUD/CHF', 'AUDCHF': 'AUD/CHF',
  'EUR/CAD': 'EUR/CAD', 'EURCAD': 'EUR/CAD',
  'GBP/CAD': 'GBP/CAD', 'GBPCAD': 'GBP/CAD'
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

// Guaranteed Data Fetcher via Multi-Endpoint Fallback
async function fetchRealForexCandles(pairStr, limit = 3000) {
  const cleanPair = pairStr.toUpperCase().trim();
  const pairFormatted = PAIR_MAP[cleanPair] || 'USD/JPY';
  const symbolNoSlash = pairFormatted.replace('/', '');

  // Provider 1: Public Financial Forex Engine
  try {
    const url1 = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(pairFormatted)}&interval=1min&outputsize=500&apikey=demo`;
    const res1 = await fetch(url1);
    const data1 = await res1.json();

    if (data1 && data1.values && data1.values.length > 0) {
      let candles = data1.values.map(item => {
        const open = parseFloat(item.open);
        const high = parseFloat(item.high);
        const low = parseFloat(item.low);
        const close = parseFloat(item.close);
        const ts = Math.floor(new Date(item.datetime).getTime() / 1000);

        return {
          close: close,
          high: high,
          low: low,
          open: open,
          pair: cleanPair,
          signal: close >= open ? "CALL" : "PUT",
          time: formatTimeUTC6(ts * 1000),
          timestamp: ts,
          volume: 0
        };
      });
      return candles;
    }
  } catch (e) {
    console.log("Provider 1 failed, attempting Provider 2...");
  }

  // Provider 2: Alternative Live Market Data Stream
  try {
    const url2 = `https://financialmodelingprep.com/api/v3/historical-chart/1min/${symbolNoSlash}?apikey=demo`;
    const res2 = await fetch(url2);
    const data2 = await res2.json();

    if (Array.isArray(data2) && data2.length > 0) {
      let candles = data2.map(item => {
        const open = parseFloat(item.open);
        const high = parseFloat(item.high);
        const low = parseFloat(item.low);
        const close = parseFloat(item.close);
        const ts = Math.floor(new Date(item.date).getTime() / 1000);

        return {
          close: close,
          high: high,
          low: low,
          open: open,
          pair: cleanPair,
          signal: close >= open ? "CALL" : "PUT",
          time: formatTimeUTC6(ts * 1000),
          timestamp: ts,
          volume: item.volume || 0
        };
      });
      return candles;
    }
  } catch (e) {
    console.log("Provider 2 failed");
  }

  return [];
}

// Option 1: Live JSON API Route
app.get('/api/candles', async (req, res) => {
  const pair = req.query.pair || 'USD/JPY';
  const candles = await fetchRealForexCandles(pair, 3000);
  const status = isMarketOpen() ? "MARKET OPEN" : "MARKET CLOSED";

  res.json({
    status: status,
    total_candles: candles.length,
    data: candles
  });
});

// Option 2: Visual Gold Frame Chart Route
app.get('/chart', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'chart.html'));
});

app.listen(PORT, () => {
  console.log(`DARK SECRET Server running on port ${PORT}`);
});
