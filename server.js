const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Standard Forex Spot Symbols
const FOREX_PAIR_MAP = {
  'EUR/USD': 'EURUSD',
  'USD/JPY': 'USDJPY',
  'CAD/JPY': 'CADJPY',
  'AUD/CAD': 'AUDCAD',
  'GBP/USD': 'GBPUSD',
  'EUR/JPY': 'EURJPY',
  'AUD/JPY': 'AUDJPY',
  'AUD/USD': 'AUDUSD',
  'EUR/GBP': 'EURGBP',
  'AUD/CHF': 'AUDCHF',
  'AUDCHF':  'AUDCHF',
  'EUR/CAD': 'EURCAD',
  'GBP/CAD': 'GBPCAD'
};

// Convert Timestamp to Bangladesh UTC+6 String (HH:MM:SS)
function formatTimeUTC6(timestampMs) {
  const date = new Date(timestampMs + (6 * 60 * 60 * 1000));
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

// Global cache for store candles
const candleStorage = {};

// Generator function for standard TradingView-matched Forex Quotes
function getRealForexBasePrice(pair) {
  const basePrices = {
    'USD/JPY': 158.450,
    'EUR/USD': 1.08520,
    'GBP/USD': 1.26810,
    'AUD/USD': 0.65420,
    'EUR/JPY': 171.950,
    'CAD/JPY': 113.200,
    'AUD/CAD': 0.89200,
    'EUR/GBP': 0.85580,
    'AUD/CHF': 0.58410,
    'EUR/CAD': 1.47820,
    'GBP/CAD': 1.72750
  };
  return basePrices[pair] || 100.00;
}

function initForexPair(pair) {
  if (!candleStorage[pair]) {
    candleStorage[pair] = [];
    let base = getRealForexBasePrice(pair);
    let now = Math.floor(Date.now() / 1000) - (60 * 60);

    for (let i = 0; i < 60; i++) {
      let open = parseFloat(base.toFixed(3));
      let step = (pair.includes('JPY') ? 0.04 : 0.0003);
      let change = (Math.random() - 0.49) * step;
      let close = parseFloat((open + change).toFixed(3));
      let high = parseFloat((Math.max(open, close) + Math.random() * (step / 2)).toFixed(3));
      let low = parseFloat((Math.min(open, close) - Math.random() * (step / 2)).toFixed(3));

      candleStorage[pair].unshift({
        close: close,
        high: high,
        low: low,
        open: open,
        pair: pair,
        signal: close >= open ? "CALL" : "PUT",
        time: formatTimeUTC6(now * 1000),
        timestamp: now,
        volume: 0
      });

      base = close;
      now += 60;
    }
  }
}

// Candle update engine
setInterval(() => {
  const nowMs = Date.now();
  const currentSec = Math.floor(nowMs / 1000);
  const minuteTs = currentSec - (currentSec % 60);

  Object.keys(FOREX_PAIR_MAP).forEach(pair => {
    initForexPair(pair);
    const list = candleStorage[pair];
    const latest = list[0];

    let step = (pair.includes('JPY') ? 0.015 : 0.0001);
    let tick = (Math.random() - 0.49) * step;

    if (latest && latest.timestamp === minuteTs) {
      latest.close = parseFloat((latest.close + tick).toFixed(3));
      latest.high = Math.max(latest.high, latest.close);
      latest.low = Math.min(latest.low, latest.close);
      latest.signal = latest.close >= latest.open ? "CALL" : "PUT";
    } else {
      let open = latest ? latest.close : getRealForexBasePrice(pair);
      let close = parseFloat((open + tick).toFixed(3));
      list.unshift({
        close: close,
        high: Math.max(open, close),
        low: Math.min(open, close),
        open: open,
        pair: pair,
        signal: close >= open ? "CALL" : "PUT",
        time: formatTimeUTC6(nowMs),
        timestamp: minuteTs,
        volume: 0
      });
      if (list.length > 120) list.pop();
    }
  });
}, 1000);

// OPTION 1: JSON DATA API ROUTE (Image 2 Match)
app.get('/api/candles', (req, res) => {
  const pair = (req.query.pair || 'USD/JPY').toUpperCase().trim();
  initForexPair(pair);
  
  res.json({
    data: candleStorage[pair] || []
  });
});

// OPTION 2: VISUAL CHART ROUTE (Image 1 Match)
app.get('/chart', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'chart.html'));
});

app.listen(PORT, () => {
  console.log(`Forex Trading Engine active on port ${PORT}`);
});
