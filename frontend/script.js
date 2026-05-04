document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const apiTableBody = document.getElementById('apiTableBody');
    const refreshBtn = document.getElementById('refreshBtn');
    const autoRefreshToggle = document.getElementById('autoRefresh');
    const totalCountEl = document.getElementById('totalCount');
    const upCountEl = document.getElementById('upCount');
    const downCountEl = document.getElementById('downCount');
    
    const addApiBtn = document.getElementById('addApiBtn');
    const addApiModal = document.getElementById('addApiModal');
    const closeBtns = document.querySelectorAll('.close, .close-btn');
    const addApiForm = document.getElementById('addApiForm');
    const toast = document.getElementById('toast');

    // State
    let refreshInterval;
    const REFRESH_RATE = 10000; // 10 seconds

    // Fetch API Status
    const fetchApiStatus = async () => {
        try {
            refreshBtn.classList.add('loading');
            refreshBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spin"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.59-9.28l5.67-5.67"/></svg> Refreshing...';
            
            const response = await fetch('/status');
            const data = await response.json();
            
            renderTable(data);
            updateStats(data);
            
        } catch (error) {
            console.error('Error fetching API status:', error);
            showToast('Failed to fetch API status. Is the server running?', 'error');
        } finally {
            refreshBtn.classList.remove('loading');
            refreshBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.59-9.28l5.67-5.67"/></svg> Refresh Now';
        }
    };

    // Render Table
    const renderTable = (apis) => {
        if (!apis || apis.length === 0) {
            apiTableBody.innerHTML = '<tr><td colspan="5" class="text-center">No APIs monitored yet. Add one!</td></tr>';
            return;
        }

        apiTableBody.innerHTML = '';
        
        apis.forEach(api => {
            const tr = document.createElement('tr');
            
            const statusClass = api.status ? api.status.toLowerCase() : 'pending';
            const statusText = api.status || 'PENDING';
            
            const timeObj = api.lastChecked ? new Date(api.lastChecked) : new Date();
            const timeString = timeObj.toLocaleTimeString();
            
            tr.innerHTML = `
                <td><strong>${api.name}</strong></td>
                <td><a href="${api.url}" target="_blank" style="color: var(--primary); text-decoration: none;">${api.url}</a></td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>${api.responseTime || '-'}</td>
                <td>${timeString}</td>
            `;
            
            apiTableBody.appendChild(tr);
        });
    };

    // Update Stats Overview
    const updateStats = (apis) => {
        const total = apis.length;
        const up = apis.filter(api => api.status === 'UP').length;
        const down = apis.filter(api => api.status === 'DOWN').length;
        
        totalCountEl.textContent = total;
        upCountEl.textContent = up;
        downCountEl.textContent = down;
    };

    // Add New API
    addApiForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('apiName').value;
        const url = document.getElementById('apiUrl').value;
        
        const submitBtn = addApiForm.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Adding...';
        submitBtn.disabled = true;
        
        try {
            const response = await fetch('/apis', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, url })
            });
            
            if (response.ok) {
                closeModal();
                addApiForm.reset();
                showToast('API added successfully!', 'success');
                fetchApiStatus(); // Refresh data immediately
            } else {
                const data = await response.json();
                showToast(data.error || 'Failed to add API', 'error');
            }
        } catch (error) {
            showToast('Network error occurred', 'error');
        } finally {
            submitBtn.textContent = 'Add API';
            submitBtn.disabled = false;
        }
    });

    // Toast Notification
    const showToast = (message, type = 'success') => {
        toast.textContent = message;
        toast.className = `toast show ${type}`;
        
        setTimeout(() => {
            toast.className = 'toast';
        }, 3000);
    };

    // Modal Logic
    const openModal = () => {
        addApiModal.classList.add('show');
    };

    const closeModal = () => {
        addApiModal.classList.remove('show');
    };

    addApiBtn.addEventListener('click', openModal);
    
    closeBtns.forEach(btn => {
        btn.addEventListener('click', closeModal);
    });

    window.addEventListener('click', (e) => {
        if (e.target === addApiModal) {
            closeModal();
        }
    });

    // Auto Refresh Logic
    const toggleAutoRefresh = () => {
        if (autoRefreshToggle.checked) {
            refreshInterval = setInterval(fetchApiStatus, REFRESH_RATE);
        } else {
            clearInterval(refreshInterval);
        }
    };

    autoRefreshToggle.addEventListener('change', toggleAutoRefresh);
    refreshBtn.addEventListener('click', fetchApiStatus);

    // Initial load
    fetchApiStatus();
    toggleAutoRefresh();
});

// Add spin animation to CSS programmatically for refresh button
const style = document.createElement('style');
style.innerHTML = `
    .spin {
        animation: spin 1s linear infinite;
    }
    @keyframes spin {
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);
