const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Standard API response mock so /api/candles doesn't fail
app.get('/api/candles', (req, res) => {
  res.json({
    status: "MARKET OPEN",
    message: "TradingView Direct Widget Engine Active",
    pair: req.query.pair || 'USD/JPY'
  });
});

app.get('/chart', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'chart.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'chart.html'));
});

app.listen(PORT, () => {
  console.log(`DARK SECRET Engine running on port ${PORT}`);
});
