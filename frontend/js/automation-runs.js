// Automation Runs Page JavaScript with Real-time Updates

const API_URL = 'http://localhost:5000/api';
let socket;
let allRuns = [];
let currentPage = 1;
const itemsPerPage = 10;

// Initialize Socket.IO connection
function initializeSocket() {
    socket = io('http://localhost:5000');
    
    socket.on('connect', () => {
        console.log('✅ Connected to real-time server');
    });

    socket.on('runCreated', (run) => {
        console.log('🏃 New run created:', run);
        // Add to allRuns array at the beginning
        allRuns.unshift(run);
        // Re-render with pagination
        renderRuns(allRuns);
        renderPagination();
        updateHeaderStats(allRuns);
    });
}

// Load automation runs data
async function loadRunsData() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const pack = urlParams.get('pack');
        
        // Update page header based on pack parameter
        updatePageHeader(pack);
        
        const url = pack ? `${API_URL}/automation-runs?pack=${encodeURIComponent(pack)}` : `${API_URL}/automation-runs`;
        console.log('🏃 Fetching runs from:', url);
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Runs API failed: ${response.status}`);
        }
        
        const runs = await response.json();
        console.log('✅ Runs loaded:', runs);
        
        if (!runs || runs.length === 0) {
            showNoDataMessage('No automation runs available');
            updateHeaderStats([], pack);
            return;
        }
        
        allRuns = runs;
        currentPage = 1; // Reset to first page
        renderRuns(runs);
        renderPagination();
        updateHeaderStats(runs, pack);
        
        // Update last updated timestamp
        const lastUpdatedEl = document.getElementById('lastUpdated');
        if (lastUpdatedEl) {
            lastUpdatedEl.textContent = new Date().toLocaleString();
        }
    } catch (error) {
        console.error('❌ Error loading runs:', error);
        showErrorMessage(`Failed to load runs: ${error.message}`);
    }
}

// Update page header based on pack parameter
function updatePageHeader(pack) {
    const pageHeaderTitle = document.getElementById('pageHeaderTitle');
    const pageSubtitle = document.getElementById('pageSubtitle');
    const pageTitle = document.getElementById('pageTitle');
    const packBreadcrumb = document.getElementById('packBreadcrumb');
    const packBreadcrumbArrow = document.getElementById('packBreadcrumbArrow');
    
    if (pack) {
        // Format pack name (replace hyphens/underscores with spaces and capitalize)
        const packName = pack.split(/[-_]/).map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
        
        if (pageHeaderTitle) {
            pageHeaderTitle.innerHTML = `<i class="fas fa-play-circle"></i> ${packName} - Runs History`;
        }
        if (pageSubtitle) {
            pageSubtitle.textContent = `Execution history for ${packName} pack`;
        }
        if (pageTitle) {
            pageTitle.textContent = 'Runs';
        }
        if (packBreadcrumb) {
            packBreadcrumb.textContent = packName;
            packBreadcrumb.style.display = 'inline';
        }
        if (packBreadcrumbArrow) {
            packBreadcrumbArrow.style.display = 'inline';
        }
        
        // Update document title
        document.title = `Report Portal - ${packName} Runs`;
    } else {
        if (pageHeaderTitle) {
            pageHeaderTitle.innerHTML = '<i class="fas fa-play-circle"></i> Automation Runs';
        }
        if (pageSubtitle) {
            pageSubtitle.textContent = 'Execution history across automation packs';
        }
        if (pageTitle) {
            pageTitle.textContent = 'Runs';
        }
        if (packBreadcrumb) {
            packBreadcrumb.style.display = 'none';
        }
        if (packBreadcrumbArrow) {
            packBreadcrumbArrow.style.display = 'none';
        }
        
        // Update document title
        document.title = 'Report Portal - All Automation Runs';
    }
}

// Update header stats
function updateHeaderStats(runs, pack) {
    const totalRunsEl = document.getElementById('totalRuns');
    const testsPerRunEl = document.getElementById('testsPerRun');
    const avgPassRateEl = document.getElementById('avgPassRate');
    
    if (totalRunsEl) {
        totalRunsEl.textContent = runs.length || 0;
    }
    
    if (testsPerRunEl) {
        const totalTests = runs.length > 0 
            ? runs.reduce((sum, r) => sum + ((r.passed || 0) + (r.failed || 0) + (r.skipped || 0)), 0)
            : 0;
        testsPerRunEl.textContent = totalTests;
    }
    
    if (avgPassRateEl) {
        const avgPassRate = runs.length > 0 
            ? Math.round(runs.reduce((sum, r) => sum + (r.passRate || 0), 0) / runs.length)
            : 0;
        avgPassRateEl.textContent = avgPassRate + '%';
    }
}

function showNoDataMessage(message) {
    const tbody = document.querySelector('.data-table tbody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="12" style="text-align: center; padding: 40px;">
                    <i class="fas fa-inbox" style="font-size: 48px; color: #ccc;"></i>
                    <p style="margin-top: 16px; color: #666;">${message}</p>
                </td>
            </tr>
        `;
    }
}

function showErrorMessage(message) {
    const mainContainer = document.querySelector('.main-container');
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

// Render runs table
function renderRuns(runs) {
    console.log('📊 Rendering runs:', runs.length);
    
    const tbody = document.querySelector('.data-table tbody');
    if (!tbody) return;

    if (runs.length === 0) {
        showNoDataMessage('No automation runs available');
        document.getElementById('pagination').style.display = 'none';
        return;
    }

    // Calculate pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedRuns = runs.slice(startIndex, endIndex);

    tbody.innerHTML = paginatedRuns.map(run => `
        <tr class="run-row ${run.status === 'failed' ? 'run-failed' : ''}" data-run-id="${run.id}">
            <td><span class="run-id">${run.id}</span></td>
            <td><span class="badge badge-${(run.portfolioName || '').toLowerCase()}">${run.portfolioName || 'N/A'}</span></td>
            <td>${run.projectName || 'N/A'}</td>
            <td>${run.packName || 'N/A'}</td>
            <td>${run.startTime ? new Date(run.startTime).toLocaleString() : 'N/A'}</td>
            <td>${Math.round((run.duration || 0) / 60000)} min</td>
            <td><span class="badge-success">${run.passed || 0}</span></td>
            <td><span class="badge-danger">${run.failed || 0}</span></td>
            <td><span class="badge-warning">${run.skipped || 0}</span></td>
            <td><span class="progress-bar"><span class="progress-fill" style="width: ${run.passRate || 0}%;"></span>${run.passRate || 0}%</span></td>
            <td><span class="status-badge status-${run.status || 'pending'}">${run.status || 'pending'}</span></td>
            <td>
                <button class="btn-icon" onclick="viewDetails('${run.id}')" title="View Test Cases"><i class="fas fa-eye"></i></button>
            </td>
        </tr>
    `).join('');
    
    console.log('✅ Runs rendered successfully');
}

// Prepend new run row (deprecated - now using full re-render with pagination)
function prependRunRow(run) {
    // Deprecated - real-time updates now re-render with pagination
    console.log('prependRunRow is deprecated, using full re-render instead');
}

// Render pagination controls
function renderPagination() {
    const paginationDiv = document.getElementById('pagination');
    const pageInfo = document.getElementById('pageInfo');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    if (!allRuns || allRuns.length === 0) {
        paginationDiv.style.display = 'none';
        return;
    }
    
    const totalPages = Math.ceil(allRuns.length / itemsPerPage);
    
    if (totalPages <= 1) {
        paginationDiv.style.display = 'none';
        return;
    }
    
    paginationDiv.style.display = 'flex';
    pageInfo.textContent = `Page ${currentPage} of ${totalPages} (${allRuns.length} runs)`;
    
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
        renderRuns(allRuns);
        renderPagination();
        // Scroll to top of table
        document.querySelector('.content-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function nextPage() {
    const totalPages = Math.ceil(allRuns.length / itemsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        renderRuns(allRuns);
        renderPagination();
        // Scroll to top of table
        document.querySelector('.content-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Refresh Table
function refreshTable() {
    console.log('🔄 Refreshing automation runs data...');
    loadRunsData();
}

// Export Table
function exportTable() {
    console.log('📥 Exporting automation runs data to CSV...');
    
    if (!allRuns || allRuns.length === 0) {
        alert('No automation run data available to export');
        return;
    }
    
    // Define CSV headers
    const headers = [
        'Run ID',
        'Portfolio',
        'Project',
        'Automation Pack',
        'Pack Run Date',
        'Duration (min)',
        'Passed',
        'Failed',
        'Skipped',
        'Pass Rate (%)',
        'Status'
    ];
    
    // Convert run data to CSV rows
    const rows = allRuns.map(run => [
        run.id || '',
        run.portfolioName || 'N/A',
        run.projectName || 'N/A',
        run.packName || 'N/A',
        run.startTime ? new Date(run.startTime).toLocaleString() : 'N/A',
        Math.round((run.duration || 0) / 60),
        run.passed || 0,
        run.failed || 0,
        run.skipped || 0,
        run.passRate || 0,
        run.status || 'pending'
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
    link.setAttribute('download', `automation-runs_${timestamp}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log('✅ Automation runs data exported successfully');
}

// Trigger New Run (deprecated - kept for compatibility) (deprecated - kept for compatibility)
function triggerRun() {
    // Button removed - function kept for compatibility
    console.log('Trigger run button has been removed');
}

// View Run Details
function viewDetails(runId) {
    console.log(`👁️ Viewing test case details for Run ${runId}`);
    // Navigate to test cases page
    window.location.href = `test-cases.html?runId=${runId}`;
}

// Download Report
function downloadReport(runId) {
    console.log(`📥 Downloading report for Run ${runId}`);
    alert(`Downloading report for Run #${runId}`);
}

// Compare Runs
function compareRuns() {
    const run1 = document.getElementById('run1Select').value;
    const run2 = document.getElementById('run2Select').value;
    alert(`Comparing Run #${run1} vs Run #${run2}`);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Automation Runs page loaded - initializing...');
    initializeSocket();
    loadRunsData();
});