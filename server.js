const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Pair Symbol Mapping for OANDA / Forex Feed (TradingView Data Provider)
const PAIR_MAP = {
  'EUR/USD': 'EUR_USD', 'EURUSD': 'EUR_USD',
  'USD/JPY': 'USD_JPY', 'USDJPY': 'USD_JPY',
  'CAD/JPY': 'CAD_JPY', 'CADJPY': 'CAD_JPY',
  'AUD/CAD': 'AUD_CAD', 'AUDCAD': 'AUD_CAD',
  'GBP/USD': 'GBP_USD', 'GBPUSD': 'GBP_USD',
  'EUR/JPY': 'EUR_JPY', 'EURJPY': 'EUR_JPY',
  'AUD/JPY': 'AUD_JPY', 'AUDJPY': 'AUD_JPY',
  'AUD/USD': 'AUD_USD', 'AUDUSD': 'AUD_USD',
  'EUR/GBP': 'EUR_GBP', 'EURGBP': 'EUR_GBP',
  'AUD/CHF': 'AUD_CHF', 'AUDCHF': 'AUD_CHF',
  'EUR/CAD': 'EUR_CAD', 'EURCAD': 'EUR_CAD',
  'GBP/CAD': 'GBP_CAD', 'GBPCAD': 'GBP_CAD'
};

// Convert Timestamp to Bangladesh Time (UTC+6)
function formatTimeUTC6(timestampMs) {
  const date = new Date(timestampMs + (6 * 60 * 60 * 1000));
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

// Check Market Hours (Forex closes Weekend)
function isMarketOpen() {
  const now = new Date();
  const day = now.getUTCDay();
  const hour = now.getUTCHours();

  if (day === 6) return false;
  if (day === 5 && hour >= 21) return false;
  if (day === 0 && hour < 21) return false;
  return true;
}

// Fetch TradingView-Matched OANDA Forex Candles
async function fetchTradingViewForexCandles(pairStr, count = 3000) {
  const cleanPair = pairStr.toUpperCase().trim();
  const symbol = PAIR_MAP[cleanPair] || 'EUR_USD';

  // Direct Forex Provider Endpoint (TradingView Standard Provider)
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}=X?interval=1m&range=5d`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
    const result = await response.json();

    const chartResult = result.chart.result[0];
    const timestamps = chartResult.timestamp;
    const quotes = chartResult.indicators.quote[0];

    let candles = [];
    for (let i = 0; i < timestamps.length; i++) {
      if (quotes.open[i] && quotes.high[i] && quotes.low[i] && quotes.close[i]) {
        const open = parseFloat(quotes.open[i].toFixed(5));
        const high = parseFloat(quotes.high[i].toFixed(5));
        const low = parseFloat(quotes.low[i].toFixed(5));
        const close = parseFloat(quotes.close[i].toFixed(5));
        const timestampMs = timestamps[i] * 1000;

        candles.push({
          close: close,
          high: high,
          low: low,
          open: open,
          pair: cleanPair,
          signal: close >= open ? "CALL" : "PUT",
          time: formatTimeUTC6(timestampMs),
          timestamp: timestamps[i],
          volume: quotes.volume[i] || 0
        });
      }
    }

    // Limit to requested count and reverse (newest first for JSON)
    return candles.slice(-count).reverse();
  } catch (err) {
    console.error("Forex Fetch Failed:", err.message);
    return [];
  }
}

// API Route (Image 2 Output)
app.get('/api/candles', async (req, res) => {
  const pair = req.query.pair || 'USD/JPY';
  const candles = await fetchTradingViewForexCandles(pair, 3000);
  const marketStatus = isMarketOpen() ? "MARKET OPEN" : "MARKET CLOSED";

  res.json({
    status: marketStatus,
    total_candles: candles.length,
    data: candles
  });
});

// Canvas Visual Route (Image 1 Output)
app.get('/chart', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'chart.html'));
});

app.listen(PORT, () => {
  console.log(`TradingView Forex Engine running on port ${PORT}`);
});
