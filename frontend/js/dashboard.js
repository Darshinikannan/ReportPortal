// Dashboard Page JavaScript with Real-time Updates

const API_URL = 'http://localhost:5000/api';
let socket;

// Initialize Socket.IO connection
function initializeSocket() {
    socket = io('http://localhost:5000');
    
    socket.on('connect', () => {
        console.log('✅ Connected to real-time server');
        showConnectionStatus(true);
    });

    socket.on('globalMetricsUpdated', (metrics) => {
        console.log('📊 Global metrics updated:', metrics);
        updateDashboardMetrics(metrics);
    });

    socket.on('portfolioUpdated', (portfolio) => {
        console.log('📁 Portfolio updated:', portfolio);
        updatePortfolioCard(portfolio);
    });

    socket.on('projectUpdated', (project) => {
        console.log('📂 Project updated:', project);
        // Refresh if needed
        loadDashboardData();
    });

    socket.on('disconnect', () => {
        console.log('❌ Disconnected from real-time server');
        showConnectionStatus(false);
    });

    socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        showConnectionStatus(false);
    });
}

// Show connection status indicator
function showConnectionStatus(connected) {
    let statusDiv = document.getElementById('connection-status');
    if (!statusDiv) {
        statusDiv = document.createElement('div');
        statusDiv.id = 'connection-status';
        statusDiv.style.cssText = 'position: fixed; top: 70px; right: 20px; padding: 8px 16px; border-radius: 20px; font-size: 12px; z-index: 1000; font-weight: 600; box-shadow: 0 2px 8px rgba(0,0,0,0.15);';
        document.body.appendChild(statusDiv);
    }
    
    if (connected) {
        statusDiv.textContent = '🟢 Live Updates Active';
        statusDiv.style.background = '#d4edda';
        statusDiv.style.color = '#155724';
        statusDiv.style.border = '1px solid #c3e6cb';
    } else {
        statusDiv.textContent = '🔴 Offline';
        statusDiv.style.background = '#f8d7da';
        statusDiv.style.color = '#721c24';
        statusDiv.style.border = '1px solid #f5c6cb';
    }
}

// Update dashboard KPIs
function updateDashboardMetrics(metrics) {
    console.log('📈 Updating dashboard with metrics:', metrics);
    
    try {
        const kpiCards = document.querySelectorAll('.kpi-card');
        
        if (kpiCards.length >= 6) {
            kpiCards[0].querySelector('.kpi-value').textContent = metrics.totalPortfolios || 0;
            kpiCards[1].querySelector('.kpi-value').textContent = metrics.totalProjects || 0;
            kpiCards[2].querySelector('.kpi-value').textContent = metrics.totalAutomationPacks || 0;
            kpiCards[3].querySelector('.kpi-value').textContent = metrics.totalAutomationRuns || 0;
            kpiCards[4].querySelector('.kpi-value').textContent = (metrics.totalPassedTests || 0).toLocaleString();
            kpiCards[5].querySelector('.kpi-value').textContent = (metrics.totalFailedTests || 0).toLocaleString();
        }

        // Hide all trend metrics
        const trendElements = ['portfoliosTrend', 'projectsTrend', 'packsTrend', 'runsTrend', 'passedTrend', 'failedTrend'];
        trendElements.forEach(trendId => {
            const element = document.getElementById(trendId);
            if (element) {
                element.textContent = '';
                element.className = 'kpi-trend';
                element.style.display = 'none';
            }
        });
        
        console.log('✅ Dashboard metrics updated successfully');
    } catch (error) {
        console.error('❌ Error updating dashboard metrics:', error);
    }
}

// Update portfolio card
function updatePortfolioCard(portfolio) {
    const portfolioCards = document.querySelectorAll('.portfolio-card');
    portfolioCards.forEach(card => {
        const headerText = card.querySelector('.portfolio-header h3').textContent;
        if (headerText.includes(portfolio.name)) {
            const stats = card.querySelectorAll('.stat-value');
            stats[0].textContent = portfolio.packCount;
            stats[1].textContent = portfolio.runCount;
            stats[2].textContent = portfolio.passRate + '%';
        }
    });
}

async function loadDashboardData() {
    console.log('🔄 Loading dashboard data...');
    
    try {
        showLoadingIndicator(true);
        
        console.log('📊 Fetching metrics from:', `${API_URL}/metrics`);
        const metricsResponse = await fetch(`${API_URL}/metrics`);
        if (!metricsResponse.ok) {
            throw new Error(`Metrics API failed: ${metricsResponse.status}`);
        }
        const metrics = await metricsResponse.json();
        console.log('✅ Metrics loaded:', metrics);
        updateDashboardMetrics(metrics);

        console.log('📁 Fetching portfolios from:', `${API_URL}/portfolios`);
        const portfoliosResponse = await fetch(`${API_URL}/portfolios`);
        if (!portfoliosResponse.ok) {
            throw new Error(`Portfolios API failed: ${portfoliosResponse.status}`);
        }
        const portfolios = await portfoliosResponse.json();
        console.log('✅ Portfolios loaded:', portfolios);
        // Filter out "Unassigned" portfolio from dashboard display
        const filteredPortfolios = portfolios.filter(p => p.name !== 'Unassigned');
        renderPortfolios(filteredPortfolios);

        console.log('🏃 Fetching runs from:', `${API_URL}/automation-runs?limit=5`);
        const runsResponse = await fetch(`${API_URL}/automation-runs?limit=5`);
        if (!runsResponse.ok) {
            throw new Error(`Runs API failed: ${runsResponse.status}`);
        }
        const runs = await runsResponse.json();
        console.log('✅ Runs loaded:', runs);
        renderRecentRuns(runs);

        console.log('✅ All dashboard data loaded successfully');
        showLoadingIndicator(false);
        
        // Update last updated timestamp
        const lastUpdatedTime = document.getElementById('lastUpdatedTime');
        if (lastUpdatedTime) {
            lastUpdatedTime.textContent = new Date().toLocaleString();
        }
        
    } catch (error) {
        console.error('❌ Error loading dashboard data:', error);
        showLoadingIndicator(false);
        showErrorMessage(`Failed to load dashboard data: ${error.message}`);
    }
}

// Show loading indicator
function showLoadingIndicator(show) {
    let loader = document.getElementById('dashboard-loader');
    
    if (show) {
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'dashboard-loader';
            loader.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); z-index: 9999; text-align: center;';
            loader.innerHTML = '<div style="font-size: 24px; margin-bottom: 10px;">⏳</div><div>Loading dashboard...</div>';
            document.body.appendChild(loader);
        }
        loader.style.display = 'block';
    } else {
        if (loader) {
            loader.style.display = 'none';
        }
    }
}

// Show error message
function showErrorMessage(message) {
    const mainContainer = document.querySelector('.main-container');
    
    const existingError = document.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
        <i class="fas fa-exclamation-triangle"></i>
        <p>${message}</p>
        <button onclick="location.reload()" class="btn-primary">Retry</button>
    `;
    errorDiv.style.cssText = 'padding: 20px; margin: 20px; background: #fee; border: 1px solid #fcc; border-radius: 8px; text-align: center;';
    
    if (mainContainer) {
        mainContainer.insertBefore(errorDiv, mainContainer.firstChild);
    }
}

// Render portfolios
function renderPortfolios(portfolios) {
    console.log('🎴 Rendering portfolios:', portfolios.length);
    
    const portfolioGrid = document.querySelector('.portfolio-grid');
    if (!portfolioGrid) {
        console.error('❌ Portfolio grid not found in DOM');
        return;
    }

    if (portfolios.length === 0) {
        portfolioGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #999;"><i class="fas fa-inbox" style="font-size: 48px; display: block; margin-bottom: 16px;"></i><p>No portfolios available</p></div>';
        return;
    }

    // Show only the first 3 portfolios
    const recentPortfolios = portfolios.slice(0, 3);

    portfolioGrid.innerHTML = recentPortfolios.map(portfolio => `
        <div class="portfolio-card">
            <div class="portfolio-header">
                <h3><i class="fas fa-briefcase"></i> ${portfolio.name}</h3>
                <span class="portfolio-badge">${portfolio.projectCount || 0} Projects</span>
            </div>
            <div class="portfolio-body">
                <div class="portfolio-stats">
                    <div class="stat-item">
                        <span class="stat-label">Automation Packs</span>
                        <span class="stat-value">${portfolio.packCount || 0}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Total Runs</span>
                        <span class="stat-value">${portfolio.runCount || 0}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Pass Rate</span>
                        <span class="stat-value success">${portfolio.passRate || 0}%</span>
                    </div>
                </div>
            </div>
            <div class="portfolio-footer">
                <a href="projects.html?portfolio=${encodeURIComponent(portfolio.name)}" class="btn-link">
                    View Details <i class="fas fa-arrow-right"></i>
                </a>
            </div>
        </div>
    `).join('');
    
    console.log('✅ Portfolios rendered successfully');
}

// Render recent runs
function renderRecentRuns(runs) {
    console.log('🏃 Rendering recent runs:', runs.length);
    
    const tbody = document.querySelector('.data-table tbody');
    if (!tbody) {
        console.error('❌ Table tbody not found in DOM');
        return;
    }

    if (runs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 40px; color: #999;"><i class="fas fa-inbox" style="font-size: 48px; display: block; margin-bottom: 16px;"></i><p>No recent runs available</p></td></tr>';
        return;
    }

    tbody.innerHTML = runs.map(run => `
        <tr>
            <td><span class="run-id">${run.id || 'N/A'}</span></td>
            <td><span class="badge badge-${(run.portfolioName || '').toLowerCase()}">${run.portfolioName || 'N/A'}</span></td>
            <td>${run.projectName || 'N/A'}</td>
            <td>${run.packName || 'N/A'}</td>
            <td>${run.startTime ? new Date(run.startTime).toLocaleString() : 'N/A'}</td>
            <td>${run.duration ? Math.round(run.duration / 60) : 0} min</td>
            <td><span class="status-badge status-${run.status || 'pending'}">${run.status || 'pending'}</span></td>
            <td><span class="progress-bar"><span class="progress-fill" style="width: ${run.passRate || 0}%;"></span>${run.passRate || 0}%</span></td>
            <td><a href="automation-runs.html?runId=${run.id}" class="btn-icon" title="View Details"><i class="fas fa-eye"></i></a></td>
        </tr>
    `).join('');
    
    console.log('✅ Recent runs rendered successfully');
}

// Refresh Table
function refreshTable() {
    console.log('🔄 Refreshing dashboard data...');
    loadDashboardData();
}

// Refresh Portfolios
function refreshPortfolios() {
    console.log('🔄 Refreshing portfolios...');
    loadPortfoliosData();
}

// Load portfolios data separately
async function loadPortfoliosData() {
    try {
        console.log('📁 Fetching portfolios from:', `${API_URL}/portfolios`);
        const portfoliosResponse = await fetch(`${API_URL}/portfolios`);
        if (!portfoliosResponse.ok) {
            throw new Error(`Portfolios API failed: ${portfoliosResponse.status}`);
        }
        const portfolios = await portfoliosResponse.json();
        console.log('✅ Portfolios loaded:', portfolios);
        // Filter out "Unassigned" portfolio from dashboard display
        const filteredPortfolios = portfolios.filter(p => p.name !== 'Unassigned');
        renderPortfolios(filteredPortfolios);
        
        // Update last updated timestamp
        const lastUpdatedTime = document.getElementById('lastUpdatedTime');
        if (lastUpdatedTime) {
            lastUpdatedTime.textContent = new Date().toLocaleString();
        }
    } catch (error) {
        console.error('❌ Error loading portfolios:', error);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Dashboard page loaded - initializing...');
    console.log('API URL:', API_URL);
    
    initializeSocket();
    loadDashboardData();
    
    // Set up auto-refresh every 30 seconds
    setInterval(() => {
        console.log('🔄 Auto-refreshing dashboard data...');
        loadDashboardData();
    }, 30000);
});