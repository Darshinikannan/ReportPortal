// Portfolios Page JavaScript with Real-time Updates

const API_URL = 'http://localhost:5000/api';
let socket;
let allPortfolios = [];
let currentPage = 1;
const itemsPerPage = 10;

// Initialize Socket.IO connection
function initializeSocket() {
    socket = io('http://localhost:5000');
    
    socket.on('connect', () => {
        console.log('✅ Connected to real-time server');
        showConnectionStatus(true);
    });

    socket.on('portfolioUpdated', (portfolio) => {
        console.log('📁 Portfolio updated via socket:', portfolio);
        // Ignore Unassigned portfolio updates
        if (portfolio.name === 'Unassigned') return;
        updatePortfolioInList(portfolio);
        updatePortfolioCard(portfolio);
    });

    socket.on('globalMetricsUpdated', (metrics) => {
        console.log('📊 Global metrics updated via socket:', metrics);
        updateHeaderStats(metrics);
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
        statusDiv.style.cssText = 'position: fixed; top: 70px; right: 20px; padding: 8px 16px; border-radius: 4px; font-size: 12px; z-index: 1000;';
        document.body.appendChild(statusDiv);
    }
    
    if (connected) {
        statusDiv.textContent = '🟢 Live';
        statusDiv.style.background = '#d4edda';
        statusDiv.style.color = '#155724';
    } else {
        statusDiv.textContent = '🔴 Offline';
        statusDiv.style.background = '#f8d7da';
        statusDiv.style.color = '#721c24';
    }
}

// Load portfolios data
async function loadPortfoliosData() {
    console.log('🔄 Loading portfolios data...');
    
    try {
        showLoadingIndicator(true);
        
        // Fetch portfolios
        console.log('📁 Fetching portfolios from:', `${API_URL}/portfolios`);
        const response = await fetch(`${API_URL}/portfolios`);
        if (!response.ok) {
            throw new Error(`Portfolios API failed: ${response.status} ${response.statusText}`);
        }
        
        const portfolios = await response.json();
        console.log('✅ Portfolios loaded:', portfolios);
        
        // Filter out "Unassigned" portfolio from UI display
        const filteredPortfolios = portfolios.filter(p => p.name !== 'Unassigned');
        
        if (!filteredPortfolios || filteredPortfolios.length === 0) {
            console.warn('⚠️ No portfolios found');
            showNoDataMessage('No portfolios available');
            showLoadingIndicator(false);
            return;
        }
        
        allPortfolios = filteredPortfolios;
        currentPage = 1; // Reset to first page
        renderPortfoliosTable(filteredPortfolios);
        renderPagination();
        renderPortfolioCards(filteredPortfolios);
        updateHeaderStats(null, filteredPortfolios);
        // renderCharts(portfolios);  // Temporarily disabled
        
        console.log('✅ All portfolio data loaded successfully');
        showLoadingIndicator(false);
        
        // Update last updated timestamp
        const lastUpdatedEl = document.getElementById('lastUpdated');
        if (lastUpdatedEl) {
            lastUpdatedEl.textContent = new Date().toLocaleString();
        }
        
    } catch (error) {
        console.error('❌ Error loading portfolios:', error);
        showLoadingIndicator(false);
        showErrorMessage(`Failed to load portfolios: ${error.message}`);
    }
}

// Show/hide loading indicator
function showLoadingIndicator(show) {
    let loader = document.getElementById('portfolios-loader');
    
    if (show) {
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'portfolios-loader';
            loader.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); z-index: 9999; text-align: center;';
            loader.innerHTML = '<div style="font-size: 24px; margin-bottom: 10px;">⏳</div><div>Loading portfolios...</div>';
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
    
    // Remove existing error message
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

// Show no data message
function showNoDataMessage(message) {
    const tbody = document.querySelector('.data-table tbody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" style="text-align: center; padding: 40px;">
                    <i class="fas fa-inbox" style="font-size: 48px; color: #ccc;"></i>
                    <p style="margin-top: 16px; color: #666;">${message}</p>
                </td>
            </tr>
        `;
    }
    
    const cardsGrid = document.getElementById('portfolioCardsGrid');
    if (cardsGrid) {
        cardsGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #999;">
                <i class="fas fa-inbox" style="font-size: 48px; display: block; margin-bottom: 16px;"></i>
                <p>No portfolios available</p>
            </div>
        `;
    }
}

// Update header stats
function updateHeaderStats(metrics, portfolios) {
    if (portfolios) {
        document.getElementById('totalPortfolios').textContent = portfolios.length;
        
        const totalProjects = portfolios.reduce((sum, p) => sum + (p.projectCount || 0), 0);
        document.getElementById('totalProjects').textContent = totalProjects;
        
        const avgPassRate = portfolios.length > 0 
            ? (portfolios.reduce((sum, p) => sum + (p.passRate || 0), 0) / portfolios.length).toFixed(1)
            : 0;
        document.getElementById('avgPassRate').textContent = avgPassRate + '%';
    }
    
    if (metrics) {
        document.getElementById('totalPortfolios').textContent = metrics.totalPortfolios || 0;
        document.getElementById('totalProjects').textContent = metrics.totalProjects || 0;
        document.getElementById('avgPassRate').textContent = (metrics.globalPassRate || 0) + '%';
    }
}

// Render portfolios table
function renderPortfoliosTable(portfolios) {
    console.log('📊 Rendering portfolios table:', portfolios.length);
    
    const tbody = document.querySelector('.data-table tbody');
    if (!tbody) {
        console.error('❌ Table tbody not found in DOM');
        return;
    }

    if (portfolios.length === 0) {
        showNoDataMessage('No portfolios match your filters');
        document.getElementById('pagination').style.display = 'none';
        return;
    }

    // Calculate pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedPortfolios = portfolios.slice(startIndex, endIndex);

    tbody.innerHTML = paginatedPortfolios.map(portfolio => `
        <tr data-portfolio-id="${portfolio._id}">
            <td>
                <strong><i class="fas fa-briefcase"></i> ${portfolio.name || 'N/A'}</strong>
                ${portfolio.description ? `<br><small style="color: #666;">${portfolio.description}</small>` : ''}
            </td>
            <td><span class="badge badge-primary">${portfolio.projectCount || 0}</span></td>
            <td>${portfolio.packCount || 0}</td>
            <td>${portfolio.runCount || 0}</td>
            <td>${portfolio.totalTests || 0}</td>
            <td>
                <span class="progress-bar">
                    <span class="progress-fill" style="width: ${portfolio.passRate || 0}%;"></span>
                    ${portfolio.passRate || 0}%
                </span>
            </td>
            <td>${portfolio.lastRun ? new Date(portfolio.lastRun).toLocaleString() : 'Never'}</td>
            <td><span class="status-badge status-${portfolio.status === 'active' ? 'passed' : 'failed'}">${portfolio.status || 'unknown'}</span></td>
            <td>
                <span class="badge ${getHealthBadgeClass(portfolio.health)}">
                    ${getHealthIcon(portfolio.health)} ${portfolio.health || 'unknown'}
                </span>
            </td>
            <td>
                <a href="projects.html?portfolio=${encodeURIComponent(portfolio.name)}" class="btn-icon" title="View Projects">
                    <i class="fas fa-arrow-right"></i>
                </a>
            </td>
        </tr>
    `).join('');
    
    console.log('✅ Portfolios table rendered successfully');
}

// Render portfolio cards
function renderPortfolioCards(portfolios) {
    console.log('🎴 Rendering portfolio cards:', portfolios.length);
    
    const cardsGrid = document.getElementById('portfolioCardsGrid');
    if (!cardsGrid) {
        console.error('❌ Portfolio cards grid not found');
        return;
    }

    if (portfolios.length === 0) {
        cardsGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #999;">
                <i class="fas fa-inbox" style="font-size: 48px; display: block; margin-bottom: 16px;"></i>
                <p>No portfolios available</p>
            </div>
        `;
        return;
    }

    cardsGrid.innerHTML = portfolios.map(portfolio => `
        <div class="portfolio-card" data-portfolio-card-id="${portfolio._id}">
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
                ${portfolio.description ? `<p class="portfolio-description">${portfolio.description}</p>` : ''}
                <div class="portfolio-meta">
                    <div><i class="fas fa-user"></i> ${portfolio.owner || 'Unassigned'}</div>
                    <div><i class="fas fa-heartbeat"></i> Health: ${portfolio.health || 'unknown'}</div>
                </div>
            </div>
            <div class="portfolio-footer">
                <a href="projects.html?portfolio=${encodeURIComponent(portfolio.name)}" class="btn-link">
                    View Projects <i class="fas fa-arrow-right"></i>
                </a>
            </div>
        </div>
    `).join('');
    
    console.log('✅ Portfolio cards rendered successfully');
}

// Update portfolio in list (real-time update)
function updatePortfolioInList(portfolio) {
    const row = document.querySelector(`[data-portfolio-id="${portfolio._id}"]`);
    if (!row) return;

    const cells = row.querySelectorAll('td');
    if (cells.length >= 7) {
        cells[1].innerHTML = `<span class="badge badge-primary">${portfolio.projectCount || 0}</span>`;
        cells[2].textContent = portfolio.packCount || 0;
        cells[3].textContent = portfolio.runCount || 0;
        cells[4].textContent = portfolio.totalTests || 0;
        cells[5].innerHTML = `<span class="progress-bar"><span class="progress-fill" style="width: ${portfolio.passRate || 0}%;"></span>${portfolio.passRate || 0}%</span>`;
        cells[6].textContent = portfolio.lastRun ? new Date(portfolio.lastRun).toLocaleString() : 'Never';
    }
}

// Update portfolio card (real-time update)
function updatePortfolioCard(portfolio) {
    const card = document.querySelector(`[data-portfolio-card-id="${portfolio._id}"]`);
    if (!card) return;

    const stats = card.querySelectorAll('.stat-value');
    if (stats.length >= 3) {
        stats[0].textContent = portfolio.packCount || 0;
        stats[1].textContent = portfolio.runCount || 0;
        stats[2].textContent = (portfolio.passRate || 0) + '%';
    }
}

// Helper functions for health status
function getHealthBadgeClass(health) {
    switch(health?.toLowerCase()) {
        case 'good': return 'badge-success';
        case 'fair': return 'badge-warning';
        case 'poor': return 'badge-danger';
        default: return 'badge-secondary';
    }
}

function getHealthIcon(health) {
    switch(health?.toLowerCase()) {
        case 'good': return '<i class="fas fa-check-circle"></i>';
        case 'fair': return '<i class="fas fa-exclamation-circle"></i>';
        case 'poor': return '<i class="fas fa-times-circle"></i>';
        default: return '<i class="fas fa-question-circle"></i>';
    }
}

// Render charts
function renderCharts(portfolios) {
    if (portfolios.length === 0) return;

    // 1. Projects Distribution Chart
    const projectsCtx = document.getElementById('projectsDistributionChart');
    if (projectsCtx) {
        new Chart(projectsCtx, {
            type: 'bar',
            data: {
                labels: portfolios.map(p => p.name),
                datasets: [{
                    label: 'Projects',
                    data: portfolios.map(p => p.projectCount || 0),
                    backgroundColor: 'rgba(102, 126, 234, 0.8)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }

    // 2. Pass Rates Comparison Chart
    const passRatesCtx = document.getElementById('passRatesChart');
    if (passRatesCtx) {
        new Chart(passRatesCtx, {
            type: 'bar',
            data: {
                labels: portfolios.map(p => p.name),
                datasets: [{
                    label: 'Pass Rate (%)',
                    data: portfolios.map(p => p.passRate || 0),
                    backgroundColor: portfolios.map(p => {
                        const rate = p.passRate || 0;
                        return rate >= 95 ? 'rgba(76, 175, 80, 0.8)' :
                               rate >= 85 ? 'rgba(255, 152, 0, 0.8)' :
                               'rgba(244, 67, 54, 0.8)';
                    })
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
    }

    // 3. Runs Activity Chart
    const runsCtx = document.getElementById('runsActivityChart');
    if (runsCtx) {
        new Chart(runsCtx, {
            type: 'doughnut',
            data: {
                labels: portfolios.map(p => p.name),
                datasets: [{
                    data: portfolios.map(p => p.runCount || 0),
                    backgroundColor: [
                        'rgba(102, 126, 234, 0.8)',
                        'rgba(240, 147, 251, 0.8)',
                        'rgba(79, 172, 254, 0.8)',
                        'rgba(67, 233, 123, 0.8)'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true
            }
        });
    }

    // 4. Health Status Chart
    const healthCtx = document.getElementById('healthStatusChart');
    if (healthCtx) {
        const healthCounts = {
            good: portfolios.filter(p => p.health === 'good').length,
            fair: portfolios.filter(p => p.health === 'fair').length,
            poor: portfolios.filter(p => p.health === 'poor').length
        };

        new Chart(healthCtx, {
            type: 'pie',
            data: {
                labels: ['Good', 'Fair', 'Poor'],
                datasets: [{
                    data: [healthCounts.good, healthCounts.fair, healthCounts.poor],
                    backgroundColor: [
                        'rgba(76, 175, 80, 0.8)',
                        'rgba(255, 152, 0, 0.8)',
                        'rgba(244, 67, 54, 0.8)'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true
            }
        });
    }

    // Update metrics cards
    document.getElementById('activePortfolios').textContent = portfolios.filter(p => p.status === 'active').length;
    document.getElementById('totalPacks').textContent = portfolios.reduce((sum, p) => sum + (p.packCount || 0), 0);
    document.getElementById('totalRuns').textContent = portfolios.reduce((sum, p) => sum + (p.runCount || 0), 0);
    const avgRate = portfolios.length > 0 
        ? (portfolios.reduce((sum, p) => sum + (p.passRate || 0), 0) / portfolios.length).toFixed(1)
        : 0;
    document.getElementById('overallPassRate').textContent = avgRate + '%';
}

// Table actions
function refreshTable() {
    console.log('🔄 Refreshing portfolios data...');
    loadPortfoliosData();
}

function exportTable() {
    console.log('📥 Exporting portfolio data to CSV...');
    
    if (!allPortfolios || allPortfolios.length === 0) {
        alert('No portfolio data available to export');
        return;
    }
    
    // Define CSV headers
    const headers = [
        'Portfolio Name',
        'Projects',
        'Automation Packs',
        'Total Runs',
        'Total Tests',
        'Pass Rate (%)',
        'Last Run',
        'Status',
        'Health',
        'Owner',
        'Description'
    ];
    
    // Convert portfolio data to CSV rows
    const rows = allPortfolios.map(portfolio => [
        portfolio.name || '',
        portfolio.projectCount || 0,
        portfolio.packCount || 0,
        portfolio.runCount || 0,
        portfolio.totalTests || 0,
        portfolio.passRate || 0,
        portfolio.lastRun ? new Date(portfolio.lastRun).toLocaleString() : 'Never',
        portfolio.status || 'unknown',
        portfolio.health || 'unknown',
        portfolio.owner || 'Unassigned',
        portfolio.description ? `"${portfolio.description.replace(/"/g, '""')}"` : ''
    ]);
    
    // Create CSV content
    let csvContent = headers.join(',') + '\n';
    rows.forEach(row => {
        csvContent += row.join(',') + '\n';
    });
    
    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `portfolios_${timestamp}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log('✅ Portfolio data exported successfully');
}

// Render pagination controls
function renderPagination() {
    const paginationDiv = document.getElementById('pagination');
    const pageInfo = document.getElementById('pageInfo');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    if (!allPortfolios || allPortfolios.length === 0) {
        paginationDiv.style.display = 'none';
        return;
    }
    
    const totalPages = Math.ceil(allPortfolios.length / itemsPerPage);
    
    if (totalPages <= 1) {
        paginationDiv.style.display = 'none';
        return;
    }
    
    paginationDiv.style.display = 'flex';
    pageInfo.textContent = `Page ${currentPage} of ${totalPages} (${allPortfolios.length} portfolios)`;
    
    // Enable/disable buttons
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
    
    // Update button styles
    if (currentPage === 1) {
        prevBtn.style.opacity = '0.5';
        prevBtn.style.cursor = 'not-allowed';
    } else {
        prevBtn.style.opacity = '1';
        prevBtn.style.cursor = 'pointer';
    }
    
    if (currentPage === totalPages) {
        nextBtn.style.opacity = '0.5';
        nextBtn.style.cursor = 'not-allowed';
    } else {
        nextBtn.style.opacity = '1';
        nextBtn.style.cursor = 'pointer';
    }
}

// Pagination
function previousPage() {
    if (currentPage > 1) {
        currentPage--;
        renderPortfoliosTable(allPortfolios);
        renderPagination();
        // Scroll to top of table
        document.querySelector('.content-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function nextPage() {
    const totalPages = Math.ceil(allPortfolios.length / itemsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        renderPortfoliosTable(allPortfolios);
        renderPagination();
        // Scroll to top of table
        document.querySelector('.content-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Portfolios page loaded - initializing...');
    console.log('API URL:', API_URL);
    
    // Initialize socket connection
    initializeSocket();
    
    // Load initial data
    loadPortfoliosData();
    
    // Update last updated timestamp
    document.getElementById('lastUpdated').textContent = new Date().toLocaleString();
    
    // Set up auto-refresh every 30 seconds
    setInterval(() => {
        console.log('🔄 Auto-refreshing portfolios data...');
        loadPortfoliosData();
        document.getElementById('lastUpdated').textContent = new Date().toLocaleString();
    }, 30000);
});