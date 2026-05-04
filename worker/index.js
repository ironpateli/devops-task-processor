const axios = require('axios');
const crypto = require('crypto-js');

// Master node URL (resolved via Docker internal DNS)
const MASTER_URL = process.env.MASTER_URL || 'http://master:3000';
const WORKER_ID = 'worker-' + Math.random().toString(36).substring(2, 9);

console.log(`[${WORKER_ID}] Starting worker node. Master URL: ${MASTER_URL}`);

// Simulate Proof-of-Work to consume CPU time
const performWork = (jobId, difficulty) => {
  return new Promise((resolve) => {
    // We are trying to find a string that hashes to a value starting with N zeros
    const targetPrefix = '0'.repeat(difficulty);
    let nonce = 0;
    let hash = '';

    while (true) {
      hash = crypto.SHA256(jobId + nonce.toString()).toString();
      if (hash.startsWith(targetPrefix)) {
        break;
      }
      nonce++;
    }

    resolve(hash);
  });
};

const pollForWork = async () => {
  try {
    // 1. Acquire Job
    const acquireRes = await axios.get(`${MASTER_URL}/api/jobs/acquire?workerId=${WORKER_ID}`);
    const job = acquireRes.data.job;

    if (job) {
      console.log(`[${WORKER_ID}] Acquired job ${job.id} (Difficulty: ${job.difficulty})`);
      
      // 2. Do the work
      const resultHash = await performWork(job.id, job.difficulty);
      console.log(`[${WORKER_ID}] Completed job ${job.id}. Hash: ${resultHash}`);

      // 3. Submit completion
      await axios.post(`${MASTER_URL}/api/jobs/complete`, {
        jobId: job.id,
        workerId: WORKER_ID,
        result: resultHash
      });
      
      // Look for next job immediately
      setTimeout(pollForWork, 100); 
    } else {
      // No work available, wait and poll again
      setTimeout(pollForWork, 2000);
    }
  } catch (error) {
    console.error(`[${WORKER_ID}] Error communicating with master:`, error.message);
    // Wait longer on error (e.g. master is down)
    setTimeout(pollForWork, 5000);
  }
};

// Start polling
setTimeout(pollForWork, 1000);
