document.addEventListener('DOMContentLoaded', () => {
    const addJobBtn = document.getElementById('addJobBtn');
    const jobsTableBody = document.getElementById('jobsTableBody');
    
    // Stats elements
    const statElements = {
        total: document.getElementById('statTotal'),
        pending: document.getElementById('statPending'),
        processing: document.getElementById('statProcessing'),
        completed: document.getElementById('statCompleted')
    };

    // Fetch and render state
    const fetchState = async () => {
        try {
            const res = await fetch('/api/jobs');
            const data = await res.json();
            
            updateStats(data.stats);
            renderTable(data.jobs);
        } catch (error) {
            console.error('Error fetching state:', error);
        }
    };

    const updateStats = (stats) => {
        statElements.total.textContent = stats.total;
        statElements.pending.textContent = stats.pending;
        statElements.processing.textContent = stats.processing;
        statElements.completed.textContent = stats.completed;
    };

    const renderTable = (jobs) => {
        jobsTableBody.innerHTML = '';
        
        if(jobs.length === 0) {
            jobsTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; color: var(--text-muted)">No jobs found. Deploy some jobs!</td></tr>';
            return;
        }

        jobs.forEach(job => {
            const tr = document.createElement('tr');
            
            let duration = '-';
            if (job.status === 'COMPLETED') {
                duration = ((job.completedAt - job.startedAt) / 1000).toFixed(2) + 's';
            } else if (job.status === 'PROCESSING') {
                duration = 'working...';
            }

            tr.innerHTML = `
                <td>${job.id.substring(0, 8)}...</td>
                <td><span class="badge ${job.status.toLowerCase()}">${job.status}</span></td>
                <td>${job.difficulty}</td>
                <td style="color: var(--primary)">${job.workerId || '-'}</td>
                <td style="font-size: 0.8rem">${job.result || '-'}</td>
                <td>${duration}</td>
            `;
            jobsTableBody.appendChild(tr);
        });
    };

    // Add multiple jobs
    addJobBtn.addEventListener('click', async () => {
        addJobBtn.disabled = true;
        addJobBtn.textContent = 'Deploying...';
        
        try {
            // Deploy 10 jobs at once
            for(let i=0; i<10; i++) {
                await fetch('/api/jobs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ difficulty: 4 }) // Requires hash starting with '0000'
                });
            }
        } catch (error) {
            console.error(error);
        } finally {
            addJobBtn.disabled = false;
            addJobBtn.textContent = 'Deploy 10 Jobs';
            fetchState(); // Immediate refresh
        }
    });

    // Poll every 1 second
    setInterval(fetchState, 1000);
    fetchState();
});
