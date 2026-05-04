const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory Job Queue and Status
let jobs = [];

// Helper to get job status counts
const getStats = () => {
  return {
    total: jobs.length,
    pending: jobs.filter(j => j.status === 'PENDING').length,
    processing: jobs.filter(j => j.status === 'PROCESSING').length,
    completed: jobs.filter(j => j.status === 'COMPLETED').length
  };
};

// API: Get all jobs (for dashboard)
app.get('/api/jobs', (req, res) => {
  res.json({
    stats: getStats(),
    jobs: jobs.sort((a, b) => b.createdAt - a.createdAt).slice(0, 50) // Return latest 50
  });
});

// API: Submit a new job (simulating a computational task)
app.post('/api/jobs', (req, res) => {
  const { difficulty = 4 } = req.body; // Difficulty represents leading zeros needed in hash
  
  const newJob = {
    id: uuidv4(),
    status: 'PENDING',
    difficulty: parseInt(difficulty),
    workerId: null,
    result: null,
    createdAt: Date.now(),
    startedAt: null,
    completedAt: null
  };
  
  jobs.push(newJob);
  res.status(201).json(newJob);
});

// API: Worker requests a job
app.get('/api/jobs/acquire', (req, res) => {
  const workerId = req.query.workerId || 'unknown-worker';
  
  // Find oldest pending job
  const pendingJob = jobs.find(j => j.status === 'PENDING');
  
  if (pendingJob) {
    pendingJob.status = 'PROCESSING';
    pendingJob.workerId = workerId;
    pendingJob.startedAt = Date.now();
    return res.json({ job: pendingJob });
  }
  
  res.json({ job: null }); // No work available
});

// API: Worker submits completed job
app.post('/api/jobs/complete', (req, res) => {
  const { jobId, workerId, result } = req.body;
  
  const job = jobs.find(j => j.id === jobId);
  
  if (job && job.status === 'PROCESSING' && job.workerId === workerId) {
    job.status = 'COMPLETED';
    job.result = result;
    job.completedAt = Date.now();
    return res.json({ success: true, job });
  }
  
  res.status(400).json({ error: 'Invalid job or worker' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Master Node running on port ${PORT}`);
});
