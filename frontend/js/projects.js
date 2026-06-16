// Projects Page JavaScript with Real-time Updates

const API_URL = 'http://localhost:5000/api';
let socket;
let allProjects = [];
let currentPage = 1;
const itemsPerPage = 10;

// Initialize Socket.IO connection
function initializeSocket() {
    socket = io('http://localhost:5000');
    
    socket.on('connect', () => {
        console.log('✅ Connected to real-time server');
    });

    socket.on('projectUpdated', (project) => {
        console.log('📂 Project updated:', project);
        // Ignore Unassigned project updates
        if (project.name === 'Unassigned') return;
        updateProjectRow(project);
    });
}

// Load projects data
async function loadProjectsData() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const portfolio = urlParams.get('portfolio');
        
        // Update page header based on portfolio parameter
        updatePageHeader(portfolio);
        
        const url = portfolio ? `${API_URL}/projects?portfolio=${encodeURIComponent(portfolio)}` : `${API_URL}/projects`;
        console.log('📂 Fetching projects from:', url);
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Projects API failed: ${response.status}`);
        }
        
        const projects = await response.json();
        console.log('✅ Projects loaded:', projects);
        
        // Filter out "Unassigned" project from UI display
        const filteredProjects = projects.filter(p => p.name !== 'Unassigned');
        
        if (!filteredProjects || filteredProjects.length === 0) {
            showNoDataMessage('No projects available');
            updateHeaderStats([], portfolio);
            return;
        }
        
        allProjects = filteredProjects;
        currentPage = 1; // Reset to first page
        renderProjects(filteredProjects);
        renderPagination();
        updateHeaderStats(filteredProjects, portfolio);
        
        // Update last updated timestamp
        const lastUpdatedEl = document.getElementById('lastUpdated');
        if (lastUpdatedEl) {
            lastUpdatedEl.textContent = new Date().toLocaleString();
        }
    } catch (error) {
        console.error('❌ Error loading projects:', error);
        showErrorMessage(`Failed to load projects: ${error.message}`);
    }
}

// Update page header based on portfolio parameter
function updatePageHeader(portfolio) {
    const pageHeaderTitle = document.getElementById('pageHeaderTitle');
    const pageSubtitle = document.getElementById('pageSubtitle');
    const pageTitle = document.getElementById('pageTitle');
    const portfolioBreadcrumb = document.getElementById('portfolioBreadcrumb');
    const portfolioBreadcrumbArrow = document.getElementById('portfolioBreadcrumbArrow');
    
    if (portfolio) {
        // Capitalize first letter of portfolio name
        const portfolioName = portfolio.charAt(0).toUpperCase() + portfolio.slice(1);
        
        if (pageHeaderTitle) {
            pageHeaderTitle.textContent = `${portfolioName} Portfolio Projects`;
        }
        if (pageSubtitle) {
            pageSubtitle.textContent = `Automation projects in ${portfolioName} portfolio`;
        }
        if (pageTitle) {
            pageTitle.textContent = 'Projects';
        }
        if (portfolioBreadcrumb) {
            portfolioBreadcrumb.textContent = portfolioName;
            portfolioBreadcrumb.style.display = 'inline';
        }
        if (portfolioBreadcrumbArrow) {
            portfolioBreadcrumbArrow.style.display = 'inline';
        }
        
        // Update document title
        document.title = `Report Portal - ${portfolioName} Projects`;
    } else {
        if (pageHeaderTitle) {
            pageHeaderTitle.textContent = 'Projects';
        }
        if (pageSubtitle) {
            pageSubtitle.textContent = 'Automation projects across portfolios';
        }
        if (pageTitle) {
            pageTitle.textContent = 'Projects';
        }
        if (portfolioBreadcrumb) {
            portfolioBreadcrumb.style.display = 'none';
        }
        if (portfolioBreadcrumbArrow) {
            portfolioBreadcrumbArrow.style.display = 'none';
        }
        
        // Update document title
        document.title = 'Report Portal - All Projects';
    }
}

// Update header stats
function updateHeaderStats(projects, portfolio) {
    const totalProjectsEl = document.getElementById('totalProjects');
    const totalPacksEl = document.getElementById('totalPacks');
    const avgPassRateEl = document.getElementById('avgPassRate');
    
    if (totalProjectsEl) {
        totalProjectsEl.textContent = projects.length || 0;
    }
    
    if (totalPacksEl) {
        const totalPacks = projects.reduce((sum, p) => sum + (p.packCount || 0), 0);
        totalPacksEl.textContent = totalPacks;
    }
    
    if (avgPassRateEl) {
        const avgPassRate = projects.length > 0 
            ? Math.round(projects.reduce((sum, p) => sum + (p.passRate || 0), 0) / projects.length)
            : 0;
        avgPassRateEl.textContent = avgPassRate + '%';
    }
}

function showNoDataMessage(message) {
    const tbody = document.querySelector('.data-table tbody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 40px;">
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

// Render projects table
function renderProjects(projects) {
    console.log('📊 Rendering projects:', projects.length);
    
    const tbody = document.querySelector('.data-table tbody');
    if (!tbody) return;

    if (projects.length === 0) {
        showNoDataMessage('No projects available');
        document.getElementById('pagination').style.display = 'none';
        return;
    }

    // Calculate pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedProjects = projects.slice(startIndex, endIndex);

    tbody.innerHTML = paginatedProjects.map(project => `
        <tr data-project-id="${project._id}">
            <td><strong><i class="fas fa-project-diagram"></i> ${project.name}</strong></td>
            <td><span class="badge badge-${(project.portfolioName || '').toLowerCase()}">${project.portfolioName || 'N/A'}</span></td>
            <td>${project.packCount || 0}</td>
            <td>${project.runCount || 0}</td>
            <td>${project.totalTests || 0}</td>
            <td><span class="progress-bar"><span class="progress-fill" style="width: ${project.passRate || 0}%;"></span>${project.passRate || 0}%</span></td>
            <td>${project.lastRun ? new Date(project.lastRun).toLocaleString() : 'N/A'}</td>
            <td><span class="status-badge status-${project.status === 'active' ? 'passed' : 'failed'}">${project.status || 'unknown'}</span></td>
            <td><a href="automation-packs.html?project=${encodeURIComponent(project.name)}" class="btn-icon" title="View Packs"><i class="fas fa-arrow-right"></i></a></td>
        </tr>
    `).join('');
    
    console.log('✅ Projects rendered successfully');
}

// Update specific project row
function updateProjectRow(project) {
    const row = document.querySelector(`[data-project-id="${project._id}"]`);
    if (!row) return;

    const cells = row.querySelectorAll('td');
    cells[2].textContent = project.packCount || 0;
    cells[3].textContent = project.runCount || 0;
    cells[4].textContent = project.totalTests || 0;
    cells[5].innerHTML = `<span class="progress-bar"><span class="progress-fill" style="width: ${project.passRate || 0}%;"></span>${project.passRate || 0}%</span>`;
    cells[6].textContent = project.lastRun ? new Date(project.lastRun).toLocaleString() : 'N/A';
}

// Render pagination controls
function renderPagination() {
    const paginationDiv = document.getElementById('pagination');
    const pageInfo = document.getElementById('pageInfo');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    if (!allProjects || allProjects.length === 0) {
        paginationDiv.style.display = 'none';
        return;
    }
    
    const totalPages = Math.ceil(allProjects.length / itemsPerPage);
    
    if (totalPages <= 1) {
        paginationDiv.style.display = 'none';
        return;
    }
    
    paginationDiv.style.display = 'flex';
    pageInfo.textContent = `Page ${currentPage} of ${totalPages} (${allProjects.length} projects)`;
    
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
        renderProjects(allProjects);
        renderPagination();
        // Scroll to top of table
        document.querySelector('.content-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function nextPage() {
    const totalPages = Math.ceil(allProjects.length / itemsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        renderProjects(allProjects);
        renderPagination();
        // Scroll to top of table
        document.querySelector('.content-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Table actions
function refreshTable() {
    console.log('🔄 Refreshing projects data...');
    loadProjectsData();
}

function exportTable() {
    console.log('📥 Exporting projects data to CSV...');
    
    if (!allProjects || allProjects.length === 0) {
        alert('No project data available to export');
        return;
    }
    
    // Define CSV headers
    const headers = [
        'Project Name',
        'Portfolio',
        'Automation Packs',
        'Total Runs',
        'Total Tests',
        'Pass Rate (%)',
        'Last Run',
        'Status'
    ];
    
    // Convert project data to CSV rows
    const rows = allProjects.map(project => [
        project.name || '',
        project.portfolioName || 'N/A',
        project.packCount || 0,
        project.runCount || 0,
        project.totalTests || 0,
        project.passRate || 0,
        project.lastRun ? new Date(project.lastRun).toLocaleString() : 'N/A',
        project.status || 'unknown'
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
    link.setAttribute('download', `projects_${timestamp}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log('✅ Projects data exported successfully');
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Projects page loaded - initializing...');
    initializeSocket();
    loadProjectsData();
});