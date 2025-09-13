const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3001;

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Catch-all handler: send back index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.listen(port, () => {
  console.log(`Test server running at http://localhost:${port}`);
});

module.exports = app;