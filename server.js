const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Supported Forex Pairs Mapping
const SUPPORTED_PAIRS = {
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

function isMarketOpen() {
  const now = new Date();
  const day = now.getUTCDay();
  const hour = now.getUTCHours();
  if (day === 6) return false; // Saturday
  if (day === 5 && hour >= 21) return false; // Friday close
  if (day === 0 && hour < 21) return false; // Sunday before open
  return true;
}

app.get('/api/candles', (req, res) => {
  const rawPair = (req.query.pair || 'USD/JPY').toUpperCase().trim();
  const tvSymbol = SUPPORTED_PAIRS[rawPair] || 'FX:USDJPY';
  const marketStatus = isMarketOpen() ? "MARKET OPEN" : "MARKET CLOSED";

  res.json({
    symbol: tvSymbol,
    pair: rawPair,
    status: marketStatus,
    message: "TradingView live stream active on /chart endpoint"
  });
});

app.get('/chart', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'chart.html'));
});

app.listen(PORT, () => {
  console.log(`DARK SECRET Server running with all Forex pairs on port ${PORT}`);
});
