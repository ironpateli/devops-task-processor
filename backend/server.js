const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// In-memory data storage
let monitoredApis = [
  { id: 1, name: 'JSONPlaceholder API', url: 'https://jsonplaceholder.typicode.com/posts/1' },
  { id: 2, name: 'Public APIs', url: 'https://api.publicapis.org/entries' }
];

// Generate simple ID
const generateId = () => {
  return monitoredApis.length > 0 ? Math.max(...monitoredApis.map(a => a.id)) + 1 : 1;
};

// GET /apis -> return list of monitored APIs
app.get('/apis', (req, res) => {
  res.json(monitoredApis);
});

// POST /apis -> add new API (name + URL)
app.post('/apis', (req, res) => {
  const { name, url } = req.body;
  if (!name || !url) {
    return res.status(400).json({ error: 'Name and URL are required' });
  }
  
  const newApi = {
    id: generateId(),
    name,
    url
  };
  
  monitoredApis.push(newApi);
  res.status(201).json(newApi);
});

// GET /status -> check health of all APIs
app.get('/status', async (req, res) => {
  const statusResults = await Promise.all(monitoredApis.map(async (api) => {
    const startTime = Date.now();
    try {
      const response = await axios.get(api.url, { timeout: 5000 });
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      const isUp = response.status >= 200 && response.status < 400;
      
      return {
        ...api,
        status: isUp ? 'UP' : 'DOWN',
        statusCode: response.status,
        responseTime: `${responseTime}ms`,
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      return {
        ...api,
        status: 'DOWN',
        error: error.message,
        responseTime: `${responseTime}ms`,
        lastChecked: new Date().toISOString()
      };
    }
  }));
  
  res.json(statusResults);
});

// Export app for testing, start server if not test env
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

module.exports = app;
