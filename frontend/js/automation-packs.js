// Automation Packs Page JavaScript with Real-time Updates

const API_URL = 'http://localhost:5000/api';
let socket;
let allPacks = [];
let currentPage = 1;
const itemsPerPage = 10;

// Initialize Socket.IO connection
function initializeSocket() {
    socket = io('http://localhost:5000');
    
    socket.on('connect', () => {
        console.log('✅ Connected to real-time server');
    });

    socket.on('packUpdated', (pack) => {
        console.log('📦 Pack updated:', pack);
        updatePackRow(pack);
    });
}

// Load automation packs data
async function loadPacksData() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const project = urlParams.get('project');
        
        // Update page header based on project parameter
        updatePageHeader(project);
        
        const url = project ? `${API_URL}/automation-packs?project=${encodeURIComponent(project)}` : `${API_URL}/automation-packs`;
        console.log('📦 Fetching packs from:', url);
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Packs API failed: ${response.status}`);
        }
        
        const packs = await response.json();
        console.log('✅ Packs loaded:', packs);
        
        if (!packs || packs.length === 0) {
            showNoDataMessage('No automation packs available');
            updateHeaderStats([], project);
            return;
        }
        
        allPacks = packs;
        currentPage = 1; // Reset to first page
        renderPacks(packs);
        renderPagination();
        updateHeaderStats(packs, project);
        
        // Update last updated timestamp
        const lastUpdatedEl = document.getElementById('lastUpdated');
        if (lastUpdatedEl) {
            lastUpdatedEl.textContent = new Date().toLocaleString();
        }
    } catch (error) {
        console.error('❌ Error loading packs:', error);
        showErrorMessage(`Failed to load packs: ${error.message}`);
    }
}

// Update page header based on project parameter
function updatePageHeader(project) {
    const pageHeaderTitle = document.getElementById('pageHeaderTitle');
    const pageSubtitle = document.getElementById('pageSubtitle');
    const pageTitle = document.getElementById('pageTitle');
    const projectBreadcrumb = document.getElementById('projectBreadcrumb');
    const projectBreadcrumbArrow = document.getElementById('projectBreadcrumbArrow');
    
    if (project) {
        // Capitalize first letter of project name
        const projectName = project.charAt(0).toUpperCase() + project.slice(1);
        
        if (pageHeaderTitle) {
            pageHeaderTitle.innerHTML = `<i class="fas fa-box"></i> ${projectName} Project Packs`;
        }
        if (pageSubtitle) {
            pageSubtitle.textContent = `Test automation packs for ${projectName} project`;
        }
        if (pageTitle) {
            pageTitle.textContent = 'Automation Packs';
        }
        if (projectBreadcrumb) {
            projectBreadcrumb.textContent = projectName;
            projectBreadcrumb.style.display = 'inline';
        }
        if (projectBreadcrumbArrow) {
            projectBreadcrumbArrow.style.display = 'inline';
        }
        
        // Update document title
        document.title = `Report Portal - ${projectName} Packs`;
    } else {
        if (pageHeaderTitle) {
            pageHeaderTitle.innerHTML = '<i class="fas fa-box"></i> Automation Packs';
        }
        if (pageSubtitle) {
            pageSubtitle.textContent = 'Test automation packs across projects';
        }
        if (pageTitle) {
            pageTitle.textContent = 'Automation Packs';
        }
        if (projectBreadcrumb) {
            projectBreadcrumb.style.display = 'none';
        }
        if (projectBreadcrumbArrow) {
            projectBreadcrumbArrow.style.display = 'none';
        }
        
        // Update document title
        document.title = 'Report Portal - All Automation Packs';
    }
}

// Update header stats
function updateHeaderStats(packs, project) {
    const totalPacksEl = document.getElementById('totalPacks');
    const totalRunsEl = document.getElementById('totalRuns');
    const avgPassRateEl = document.getElementById('avgPassRate');
    
    if (totalPacksEl) {
        totalPacksEl.textContent = packs.length || 0;
    }
    
    if (totalRunsEl) {
        const totalRuns = packs.reduce((sum, p) => sum + (p.runCount || 0), 0);
        totalRunsEl.textContent = totalRuns;
    }
    
    if (avgPassRateEl) {
        const avgPassRate = packs.length > 0 
            ? Math.round(packs.reduce((sum, p) => sum + (p.passRate || 0), 0) / packs.length)
            : 0;
        avgPassRateEl.textContent = avgPassRate + '%';
    }
}

function showNoDataMessage(message) {
    const tbody = document.querySelector('.data-table tbody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="11" style="text-align: center; padding: 40px;">
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

// Get pack type badge
function getPackType(pack) {
    if (pack.testCategories) {
        const categories = ['smoke', 'critical', 'regression', 'e2e'];
        for (let cat of categories) {
            if (pack.testCategories[cat] > 0) {
                return cat.charAt(0).toUpperCase() + cat.slice(1);
            }
        }
    }
    return 'General';
}

// Render packs table
function renderPacks(packs) {
    console.log('📊 Rendering packs:', packs.length);
    
    const tbody = document.querySelector('.data-table tbody');
    if (!tbody) return;

    if (packs.length === 0) {
        showNoDataMessage('No automation packs available');
        document.getElementById('pagination').style.display = 'none';
        return;
    }

    // Calculate pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedPacks = packs.slice(startIndex, endIndex);

    tbody.innerHTML = paginatedPacks.map(pack => `
        <tr data-pack-id="${pack._id}">
            <td><strong><i class="fas fa-cube"></i> ${pack.name}</strong></td>
            <td><span class="badge badge-${getPackType(pack).toLowerCase()}">${getPackType(pack)}</span></td>
            <td>${pack.runCount || 0}</td>
            <td>${pack.testCount || 0}</td>
            <td><span class="badge-success">${pack.passed || 0}</span></td>
            <td><span class="badge-danger">${pack.failed || 0}</span></td>
            <td><span class="badge-warning">${pack.skipped || 0}</span></td>
            <td><span class="progress-bar"><span class="progress-fill" style="width: ${pack.passRate || 0}%;"></span>${pack.passRate || 0}%</span></td>
            <td>${Math.round((pack.avgDuration || 0) / 60000)} min</td>
            <td>${pack.lastRun ? new Date(pack.lastRun).toLocaleString() : 'N/A'}</td>
            <td><a href="automation-runs.html?pack=${encodeURIComponent(pack.name)}" class="btn-icon" title="View Runs"><i class="fas fa-arrow-right"></i></a></td>
        </tr>
    `).join('');
    
    console.log('✅ Packs rendered successfully');
}

// Update specific pack row
function updatePackRow(pack) {
    const row = document.querySelector(`[data-pack-id="${pack._id}"]`);
    if (!row) return;

    const cells = row.querySelectorAll('td');
    cells[2].textContent = pack.runCount || 0;
    cells[3].textContent = pack.testCount || 0;
    cells[4].innerHTML = `<span class="badge-success">${pack.passed || 0}</span>`;
    cells[5].innerHTML = `<span class="badge-danger">${pack.failed || 0}</span>`;
    cells[6].innerHTML = `<span class="badge-warning">${pack.skipped || 0}</span>`;
    cells[7].innerHTML = `<span class="progress-bar"><span class="progress-fill" style="width: ${pack.passRate || 0}%;"></span>${pack.passRate || 0}%</span>`;
    cells[8].textContent = `${Math.round((pack.avgDuration || 0) / 60000)} min`;
    cells[9].textContent = pack.lastRun ? new Date(pack.lastRun).toLocaleString() : 'N/A';
}

// Render pagination controls
function renderPagination() {
    const paginationDiv = document.getElementById('pagination');
    const pageInfo = document.getElementById('pageInfo');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    if (!allPacks || allPacks.length === 0) {
        paginationDiv.style.display = 'none';
        return;
    }
    
    const totalPages = Math.ceil(allPacks.length / itemsPerPage);
    
    if (totalPages <= 1) {
        paginationDiv.style.display = 'none';
        return;
    }
    
    paginationDiv.style.display = 'flex';
    pageInfo.textContent = `Page ${currentPage} of ${totalPages} (${allPacks.length} packs)`;
    
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
        renderPacks(allPacks);
        renderPagination();
        // Scroll to top of table
        document.querySelector('.content-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function nextPage() {
    const totalPages = Math.ceil(allPacks.length / itemsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        renderPacks(allPacks);
        renderPagination();
        // Scroll to top of table
        document.querySelector('.content-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Table actions
function refreshTable() {
    console.log('🔄 Refreshing automation packs data...');
    loadPacksData();
}

function exportTable() {
    console.log('📥 Exporting automation packs data to CSV...');
    
    if (!allPacks || allPacks.length === 0) {
        alert('No automation pack data available to export');
        return;
    }
    
    // Define CSV headers
    const headers = [
        'Pack Name',
        'Pack Type',
        'Total Runs (3M)',
        'Total Tests',
        'Passed',
        'Failed',
        'Skipped',
        'Pass Rate (%)',
        'Avg Duration (min)',
        'Last Run'
    ];
    
    // Convert pack data to CSV rows
    const rows = allPacks.map(pack => [
        pack.name || '',
        getPackType(pack),
        pack.runCount || 0,
        pack.testCount || 0,
        pack.passed || 0,
        pack.failed || 0,
        pack.skipped || 0,
        pack.passRate || 0,
        Math.round((pack.avgDuration || 0) / 60000),
        pack.lastRun ? new Date(pack.lastRun).toLocaleString() : 'N/A'
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
    link.setAttribute('download', `automation-packs_${timestamp}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log('✅ Automation packs data exported successfully');
}

// Toggle Filters (deprecated - kept for compatibility) (deprecated - kept for compatibility)
function toggleFilters() {
    // Filters removed - function kept for compatibility
    console.log('Filters feature has been removed');
}

// Apply Filters (deprecated - kept for compatibility)
function applyFilters() {
    // Filters removed - function kept for compatibility
    loadPacksData();
}

// Reset Filters (deprecated - kept for compatibility)
function resetFilters() {
    // Filters removed - function kept for compatibility
    loadPacksData();
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Automation Packs page loaded - initializing...');
    initializeSocket();
    loadPacksData();
});