// Test Cases Page JavaScript

const API_URL = 'http://localhost:5000/api';
let currentRun = null;
let allTestCases = [];
let currentFilter = 'all';

// Load test cases for a specific run
async function loadTestCases() {
    const urlParams = new URLSearchParams(window.location.search);
    const runId = urlParams.get('runId');
    
    if (!runId) {
        showError('No run ID provided in URL');
        return;
    }
    
    try {
        console.log(`📥 Fetching run details for: ${runId}`);
        const response = await fetch(`${API_URL}/automation-runs/${runId}`);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch run: ${response.status} ${response.statusText}`);
        }
        
        const run = await response.json();
        currentRun = run;
        
        console.log('✅ Run details loaded:', run);
        
        // Update page header and breadcrumb
        updatePageHeader(run);
        
        // Update run info section
        updateRunInfo(run);
        
        // Update stats
        updateStats(run);
        
        // Render test cases
        if (run.testResults && run.testResults.length > 0) {
            allTestCases = run.testResults;
            renderTestCases(allTestCases);
        } else {
            showNoTestCases();
        }
        
        // Update last updated timestamp
        document.getElementById('lastUpdated').textContent = new Date().toLocaleString();
        
    } catch (error) {
        console.error('❌ Error loading test cases:', error);
        showError(`Failed to load test cases: ${error.message}`);
    }
}

// Update page header with run information
function updatePageHeader(run) {
    const runIdBreadcrumb = document.getElementById('runIdBreadcrumb');
    const runSummary = document.getElementById('runSummary');
    
    if (runIdBreadcrumb) {
        runIdBreadcrumb.textContent = run.id || 'Unknown Run';
    }
    
    if (runSummary) {
        const total = (run.passed || 0) + (run.failed || 0) + (run.skipped || 0);
        runSummary.innerHTML = `
            <strong>${run.packName || 'Unknown Pack'}</strong> - 
            Run ID: ${run.id || 'N/A'} | 
            ${run.passed || 0} passed, ${run.failed || 0} failed, ${run.skipped || 0} skipped | 
            Pass Rate: ${run.passRate || 0}%
        `;
    }
    
    // Update document title
    document.title = `Test Cases - ${run.id || 'Run'} - Report Portal`;
}

// Update run information section
function updateRunInfo(run) {
    const runInfoGrid = document.getElementById('runInfoGrid');
    
    if (!runInfoGrid) return;
    
    const startTime = run.startTime ? new Date(run.startTime).toLocaleString() : 'N/A';
    const endTime = run.endTime ? new Date(run.endTime).toLocaleString() : 'N/A';
    const duration = run.duration ? `${Math.round(run.duration / 60000)} min` : 'N/A';
    
    runInfoGrid.innerHTML = `
        <div class="info-item">
            <span class="info-label"><i class="fas fa-id-card"></i> Run ID</span>
            <span class="info-value">${run.id || 'N/A'}</span>
        </div>
        <div class="info-item">
            <span class="info-label"><i class="fas fa-briefcase"></i> Portfolio</span>
            <span class="info-value">${run.portfolioName || 'N/A'}</span>
        </div>
        <div class="info-item">
            <span class="info-label"><i class="fas fa-project-diagram"></i> Project</span>
            <span class="info-value">${run.projectName || 'N/A'}</span>
        </div>
        <div class="info-item">
            <span class="info-label"><i class="fas fa-box"></i> Pack</span>
            <span class="info-value">${run.packName || 'N/A'}</span>
        </div>
        <div class="info-item">
            <span class="info-label"><i class="fas fa-play"></i> Start Time</span>
            <span class="info-value">${startTime}</span>
        </div>
        <div class="info-item">
            <span class="info-label"><i class="fas fa-stop"></i> End Time</span>
            <span class="info-value">${endTime}</span>
        </div>
        <div class="info-item">
            <span class="info-label"><i class="fas fa-clock"></i> Duration</span>
            <span class="info-value">${duration}</span>
        </div>
        <div class="info-item">
            <span class="info-label"><i class="fas fa-chart-pie"></i> Status</span>
            <span class="info-value"><span class="status-badge status-${run.status || 'pending'}">${run.status || 'pending'}</span></span>
        </div>
    `;
    
    runInfoGrid.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; margin-bottom: 20px;';
    
    // Style info items
    const style = document.createElement('style');
    style.textContent = `
        .info-item {
            background: #f8f9fa;
            padding: 12px 15px;
            border-radius: 6px;
            border-left: 3px solid #ffed00;
        }
        .info-label {
            display: block;
            font-size: 12px;
            color: #666;
            margin-bottom: 5px;
        }
        .info-value {
            display: block;
            font-size: 14px;
            font-weight: 600;
            color: #333;
        }
    `;
    if (!document.getElementById('runInfoStyle')) {
        style.id = 'runInfoStyle';
        document.head.appendChild(style);
    }
}

// Update statistics
function updateStats(run) {
    document.getElementById('totalTests').textContent = (run.passed || 0) + (run.failed || 0) + (run.skipped || 0);
    document.getElementById('passedTests').textContent = run.passed || 0;
    document.getElementById('failedTests').textContent = run.failed || 0;
    document.getElementById('skippedTests').textContent = run.skipped || 0;
}

// Render test cases table
function renderTestCases(testCases) {
    const tbody = document.getElementById('testCasesTableBody');
    const noDataMessage = document.getElementById('noDataMessage');
    
    if (!tbody) return;
    
    // Apply filter
    const filteredCases = currentFilter === 'all' 
        ? testCases 
        : testCases.filter(tc => tc.status === currentFilter);
    
    if (filteredCases.length === 0) {
        tbody.innerHTML = '';
        if (noDataMessage) {
            noDataMessage.style.display = 'block';
            if (currentFilter !== 'all') {
                noDataMessage.innerHTML = `
                    <i class="fas fa-filter" style="font-size: 48px; color: #ccc;"></i>
                    <p style="margin-top: 16px; color: #666;">No test cases with status: <strong>${currentFilter}</strong></p>
                `;
            }
        }
        return;
    }
    
    if (noDataMessage) {
        noDataMessage.style.display = 'none';
    }
    
    tbody.innerHTML = filteredCases.map((tc, index) => {
        const duration = tc.duration ? `${(tc.duration / 1000).toFixed(2)}s` : 'N/A';
        const error = tc.error || '-';
        const truncatedError = error.length > 50 ? error.substring(0, 50) + '...' : error;
        const retries = tc.retries || 0;
        
        return `
            <tr class="test-case-row test-case-${tc.status}">
                <td>${index + 1}</td>
                <td><strong>${escapeHtml(tc.testCase || 'Unnamed Test')}</strong></td>
                <td><span class="status-badge status-${tc.status}">${tc.status || 'unknown'}</span></td>
                <td>${duration}</td>
                <td>${retries}</td>
                <td class="error-cell" title="${escapeHtml(error)}">${escapeHtml(truncatedError)}</td>
            </tr>
        `;
    }).join('');
    
    console.log(`✅ Rendered ${filteredCases.length} test cases`);
}

// Show no test cases message
function showNoTestCases() {
    const tbody = document.getElementById('testCasesTableBody');
    const noDataMessage = document.getElementById('noDataMessage');
    
    if (tbody) {
        tbody.innerHTML = '';
    }
    
    if (noDataMessage) {
        noDataMessage.style.display = 'block';
    }
}

// Filter test cases by status
function filterTestCases(status) {
    console.log(`🔍 Filtering test cases by: ${status}`);
    currentFilter = status;
    renderTestCases(allTestCases);
}

// View test case detail in modal
function viewTestCaseDetail(index) {
    const filteredCases = currentFilter === 'all' 
        ? allTestCases 
        : allTestCases.filter(tc => tc.status === currentFilter);
    
    const testCase = filteredCases[index];
    
    if (!testCase) {
        console.error('Test case not found at index:', index);
        return;
    }
    
    const modal = document.getElementById('detailModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    
    if (!modal || !modalTitle || !modalBody) return;
    
    modalTitle.textContent = testCase.testCase || 'Test Case Details';
    
    const duration = testCase.duration ? `${(testCase.duration / 1000).toFixed(2)}s` : 'N/A';
    const startTime = testCase.startTime ? new Date(testCase.startTime).toLocaleString() : 'N/A';
    const endTime = testCase.endTime ? new Date(testCase.endTime).toLocaleString() : 'N/A';
    
    modalBody.innerHTML = `
        <div class="detail-section">
            <h3><i class="fas fa-info-circle"></i> Test Information</h3>
            <table class="detail-table">
                <tr>
                    <td><strong>Status:</strong></td>
                    <td><span class="status-badge status-${testCase.status}">${testCase.status || 'unknown'}</span></td>
                </tr>
                <tr>
                    <td><strong>Duration:</strong></td>
                    <td>${duration}</td>
                </tr>
                <tr>
                    <td><strong>Start Time:</strong></td>
                    <td>${startTime}</td>
                </tr>
                <tr>
                    <td><strong>End Time:</strong></td>
                    <td>${endTime}</td>
                </tr>
                <tr>
                    <td><strong>Retries:</strong></td>
                    <td>${testCase.retries || 0}</td>
                </tr>
            </table>
        </div>
        
        ${testCase.error ? `
        <div class="detail-section">
            <h3><i class="fas fa-exclamation-triangle"></i> Error Message</h3>
            <pre class="error-pre">${escapeHtml(testCase.error)}</pre>
        </div>
        ` : ''}
        
        ${testCase.stackTrace ? `
        <div class="detail-section">
            <h3><i class="fas fa-layer-group"></i> Stack Trace</h3>
            <pre class="stack-trace-pre">${escapeHtml(testCase.stackTrace)}</pre>
        </div>
        ` : ''}
        
        ${testCase.screenshot ? `
        <div class="detail-section">
            <h3><i class="fas fa-camera"></i> Screenshot</h3>
            <a href="${testCase.screenshot}" target="_blank" class="btn-primary">
                <i class="fas fa-external-link-alt"></i> View Screenshot
            </a>
        </div>
        ` : ''}
        
        ${testCase.video ? `
        <div class="detail-section">
            <h3><i class="fas fa-video"></i> Video Recording</h3>
            <a href="${testCase.video}" target="_blank" class="btn-primary">
                <i class="fas fa-external-link-alt"></i> View Video
            </a>
        </div>
        ` : ''}
    `;
    
    modal.style.display = 'flex';
}

// Close detail modal
function closeDetailModal() {
    const modal = document.getElementById('detailModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Export test cases to CSV
function exportTestCases() {
    console.log('📥 Exporting test cases to CSV...');
    
    if (!allTestCases || allTestCases.length === 0) {
        alert('No test case data available to export');
        return;
    }
    
    // Define CSV headers
    const headers = [
        'Test Case',
        'Status',
        'Duration (s)',
        'Start Time',
        'End Time',
        'Retries',
        'Error Message'
    ];
    
    // Convert test case data to CSV rows
    const rows = allTestCases.map(tc => [
        tc.testCase || '',
        tc.status || '',
        tc.duration ? (tc.duration / 1000).toFixed(2) : '',
        tc.startTime ? new Date(tc.startTime).toISOString() : '',
        tc.endTime ? new Date(tc.endTime).toISOString() : '',
        tc.retries || 0,
        (tc.error || '').replace(/"/g, '""') // Escape quotes for CSV
    ]);
    
    // Create CSV content
    let csvContent = headers.join(',') + '\n';
    rows.forEach(row => {
        // Wrap fields in quotes if they contain commas
        const escapedRow = row.map(field => {
            const strField = String(field);
            return strField.includes(',') || strField.includes('"') ? `"${strField}"` : strField;
        });
        csvContent += escapedRow.join(',') + '\n';
    });
    
    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const runId = currentRun ? currentRun.id : 'unknown';
    
    link.setAttribute('href', url);
    link.setAttribute('download', `test-cases_${runId}_${timestamp}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log('✅ Test cases exported successfully');
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Show error message
function showError(message) {
    const mainContainer = document.querySelector('.main-container');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
        <i class="fas fa-exclamation-triangle"></i>
        <p>${message}</p>
        <button onclick="location.href='automation-runs.html'" class="btn-primary">Back to Runs</button>
    `;
    errorDiv.style.cssText = 'padding: 20px; margin: 20px; background: #fee; border: 1px solid #fcc; border-radius: 8px; text-align: center;';
    if (mainContainer) {
        mainContainer.insertBefore(errorDiv, mainContainer.firstChild);
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('detailModal');
    if (event.target === modal) {
        closeDetailModal();
    }
};

// Add modal styles
const modalStyle = document.createElement('style');
modalStyle.textContent = `
    .modal {
        display: none;
        position: fixed;
        z-index: 1000;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        overflow: auto;
        background-color: rgba(0,0,0,0.5);
        align-items: center;
        justify-content: center;
    }
    .modal-content {
        background-color: #fff;
        margin: auto;
        padding: 0;
        border-radius: 8px;
        width: 80%;
        max-width: 800px;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 4px 6px rgba(0,0,0,0.3);
    }
    .modal-header {
        padding: 20px;
        background-color: #007bff;
        color: white;
        border-radius: 8px 8px 0 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    .modal-header h2 {
        margin: 0;
        font-size: 20px;
    }
    .modal-close {
        font-size: 28px;
        font-weight: bold;
        cursor: pointer;
        color: white;
    }
    .modal-close:hover {
        opacity: 0.8;
    }
    .modal-body {
        padding: 20px;
    }
    .detail-section {
        margin-bottom: 25px;
    }
    .detail-section h3 {
        font-size: 16px;
        margin-bottom: 10px;
        color: #333;
        border-bottom: 2px solid #007bff;
        padding-bottom: 5px;
    }
    .detail-table {
        width: 100%;
        border-collapse: collapse;
    }
    .detail-table td {
        padding: 8px;
        border-bottom: 1px solid #eee;
    }
    .detail-table td:first-child {
        width: 150px;
    }
    .error-pre, .stack-trace-pre {
        background: #f8f9fa;
        padding: 15px;
        border-radius: 4px;
        border-left: 3px solid #dc3545;
        overflow-x: auto;
        font-size: 13px;
        line-height: 1.6;
        white-space: pre-wrap;
        word-wrap: break-word;
    }
    .test-case-passed {
        background-color: rgba(40, 167, 69, 0.05);
    }
    .test-case-failed {
        background-color: rgba(220, 53, 69, 0.05);
    }
    .test-case-skipped {
        background-color: rgba(255, 193, 7, 0.05);
    }
    .error-cell {
        font-size: 12px;
        color: #666;
    }
`;
document.head.appendChild(modalStyle);

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Test Cases page loaded - initializing...');
    loadTestCases();
});
