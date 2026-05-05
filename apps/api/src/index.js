const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { Pool } = require('pg');
const Redis = require('ioredis');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379');

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS jobs (
      id SERIAL PRIMARY KEY,
      payload TEXT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
}

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    await redis.ping();
    res.json({ status: 'ok', service: 'api' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

app.get('/api/jobs', async (req, res) => {
  const result = await pool.query('SELECT id, payload, status, created_at FROM jobs ORDER BY id DESC LIMIT 100');
  res.json(result.rows);
});

app.post('/api/jobs', async (req, res) => {
  const payload = req.body?.payload || 'default-job';
  const result = await pool.query(
    'INSERT INTO jobs(payload, status) VALUES($1, $2) RETURNING id, payload, status, created_at',
    [payload, 'PENDING']
  );

  await redis.lpush('job_queue', JSON.stringify(result.rows[0]));
  res.status(201).json(result.rows[0]);
});

app.listen(PORT, async () => {
  await initDb();
  console.log(`API running on port ${PORT}`);
});
