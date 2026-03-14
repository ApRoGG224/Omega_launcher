const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;


app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(morgan('dev'));
app.use(express.json());


app.get('/api/search', async (req, res) => {
  try {
    const { query, limit, offset, facets, filters } = req.query;

    const response = await axios.get('https://api.modrinth.com/v2/search', {
      params: {
        query,
        limit,
        offset,
        facets,
        filters
      },
      headers: {
        'User-Agent': 'OmegaLauncher/1.0.0 (contact@example.com)'
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error fetching from Modrinth:', error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch from Modrinth API',
      details: error.message
    });
  }
});

// Routes
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    message: 'Omega Launcher Backend is running',
    timestamp: new Date()
  });
});

// Hello route for testing
app.get('/', (req, res) => {
  res.send('<h1>Omega Launcher API</h1><p>Status: Running</p>');
});

app.listen(PORT, () => {
  console.log(`\x1b[32m[Server]\x1b[0m Running on http://localhost:${PORT}`);
});
