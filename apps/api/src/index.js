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
const MAX_PAYLOAD_LENGTH = 10000; // 10KB limit
const DB_RETRY_ATTEMPTS = 5;
const DB_RETRY_DELAY = 1000; // 1 second

// Initialize database pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Initialize Redis
const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379');

// Database initialization with retry logic
async function initDb() {
  let retries = 0;
  while (retries < DB_RETRY_ATTEMPTS) {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS jobs (
          id SERIAL PRIMARY KEY,
          payload TEXT NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);
      console.log('✓ Database initialized successfully');
      return;
    } catch (error) {
      retries++;
      const delay = DB_RETRY_DELAY * Math.pow(2, retries - 1); // Exponential backoff
      console.warn(`Database connection failed (attempt ${retries}/${DB_RETRY_ATTEMPTS}). Retrying in ${delay}ms...`, error.message);
      if (retries >= DB_RETRY_ATTEMPTS) {
        console.error('✗ Failed to initialize database after max retries');
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Validate job status
function isValidStatus(status) {
  const validStatuses = ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'];
  return validStatuses.includes(status);
}

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    const redisStatus = await redis.ping();
    
    res.status(200).json({
      status: 'ok',
      service: 'api',
      database: 'connected',
      cache: redisStatus === 'PONG' ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Health check failed:', error.message);
    res.status(503).json({
      status: 'error',
      service: 'api',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get all jobs with pagination
app.get('/api/jobs', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 100, 1000);
    const offset = parseInt(req.query.offset) || 0;
    const status = req.query.status;

    let query = 'SELECT id, payload, status, created_at, updated_at FROM jobs';
    const params = [];

    if (status) {
      if (!isValidStatus(status)) {
        return res.status(400).json({
          error: 'Invalid status filter',
          validStatuses: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']
        });
      }
      query += ' WHERE status = $1';
      params.push(status);
    }

    query += ' ORDER BY id DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const result = await pool.query(query, params);
    
    res.status(200).json({
      total: result.rows.length,
      limit,
      offset,
      data: result.rows
    });
  } catch (error) {
    console.error('Failed to fetch jobs:', error.message);
    res.status(500).json({
      error: 'Failed to fetch jobs',
      message: error.message
    });
  }
});

// Get single job by ID
app.get('/api/jobs/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({
        error: 'Invalid job ID',
        details: 'Job ID must be a positive integer'
      });
    }

    const result = await pool.query(
      'SELECT id, payload, status, created_at, updated_at FROM jobs WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Job not found',
        id
      });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Failed to fetch job:', error.message);
    res.status(500).json({
      error: 'Failed to fetch job',
      message: error.message
    });
  }
});

// Create new job
app.post('/api/jobs', async (req, res) => {
  try {
    const payload = req.body?.payload || 'default-job';

    // Validate payload
    if (typeof payload !== 'string') {
      return res.status(400).json({
        error: 'Invalid payload',
        details: 'Payload must be a string'
      });
    }

    if (payload.length === 0 || payload.length > MAX_PAYLOAD_LENGTH) {
      return res.status(400).json({
        error: 'Payload length invalid',
        details: `Payload must be between 1 and ${MAX_PAYLOAD_LENGTH} characters`
      });
    }

    const result = await pool.query(
      'INSERT INTO jobs(payload, status) VALUES($1, $2) RETURNING id, payload, status, created_at, updated_at',
      [payload, 'PENDING']
    );

    const job = result.rows[0];

    // Queue job asynchronously (don't fail if Redis fails)
    try {
      await redis.lpush('job_queue', JSON.stringify(job));
    } catch (redisError) {
      console.warn('Failed to queue job in Redis:', redisError.message);
      // Don't throw - job is still created in database
    }

    res.status(201).json({
      message: 'Job created successfully',
      job
    });
  } catch (error) {
    console.error('Failed to create job:', error.message);
    res.status(500).json({
      error: 'Failed to create job',
      message: error.message
    });
  }
});

// Update job status
app.patch('/api/jobs/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;

    // Validate job ID
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({
        error: 'Invalid job ID',
        details: 'Job ID must be a positive integer'
      });
    }

    // Validate status
    if (!status || !isValidStatus(status)) {
      return res.status(400).json({
        error: 'Invalid status',
        validStatuses: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']
      });
    }

    const result = await pool.query(
      'UPDATE jobs SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id, payload, status, created_at, updated_at',
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Job not found',
        id
      });
    }

    res.status(200).json({
      message: 'Job updated successfully',
      job: result.rows[0]
    });
  } catch (error) {
    console.error('Failed to update job:', error.message);
    res.status(500).json({
      error: 'Failed to update job',
      message: error.message
    });
  }
});

// Error handling for unmatched routes
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
    method: req.method
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
  });
});

// Server startup
async function startServer() {
  try {
    await initDb();
    
    app.listen(PORT, () => {
      console.log(`✓ API running on port ${PORT}`);
      console.log(`✓ Health check: http://localhost:${PORT}/health`);
      console.log(`✓ API Documentation: http://localhost:${PORT}/api/jobs`);
    });
  } catch (error) {
    console.error('✗ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  try {
    await pool.end();
    redis.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  try {
    await pool.end();
    redis.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

// Start the server
startServer();
