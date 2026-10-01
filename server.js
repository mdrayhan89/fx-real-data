const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());

// Serve static HTML/CSS files from public folder
app.use(express.static(path.join(__dirname, 'public')));

// Route to render chart
app.get('/chart', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'chart.html'));
});

// Default root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'chart.html'));
});

app.listen(PORT, () => {
  console.log(`DARK SECRET TradingView Server running on port ${PORT}`);
});
