// public/js/app.js â€“ Main Application Logic (Frontend)

import * as api from "./api.js";

/* ------------------------------------------------------------------
   AUTHENTICATION CHECK - Runs immediately on page load
   ------------------------------------------------------------------ */

/**
 * Check if user is authenticated
 * Redirects to login page if not authenticated
 */

function checkAuthentication() {
  const token = localStorage.getItem('authToken');
  const user = localStorage.getItem('currentUser');

  // If no token or user data, redirect to login
  if (!token || !user) {
    window.location.href = 'login.html';
    return false;
  }

  return true;
}

// Run authentication check immediately (before anything else loads)
if (!window.location.pathname.endsWith("log_in.html")) {
    if (!checkAuthentication()) {
      // Stop execution if not authenticated
        throw new Error('Authentication required - redirecting to login');
    }
}

/* ------------------------------------------------------------------
   GLOBAL STATE
   ------------------------------------------------------------------ */

let currentUser = null;
try {
  currentUser = JSON.parse(localStorage.getItem('currentUser'));
} catch (e) {
  console.error('Error parsing user data:', e);
  window.location.href = 'login.html';
}

let currentSection = "dashboard";
let allCases = [];
let allOfficers = [];
let allReports = [];
let allUsers = [];

const ITEMS_PER_PAGE = 10;
let currentPage = { cases: 1, reports: 1, personnel: 1, users: 1 };

let caseFilters = { status: "", type: "", officer: "", priority: "", search: "" };

/* ------------------------------------------------------------------
   TOAST NOTIFICATION
   ------------------------------------------------------------------ */

let toastInstance = null;

function initializeToast() {
  const toastEl = document.querySelector('.notification-toast');
  if (toastEl) {
    toastInstance = new bootstrap.Toast(toastEl, { autohide: true, delay: 4000 });
  }
}

function showToast(message, type = "info") {
  if (toastInstance) {
    const toastEl = document.querySelector('.notification-toast');
    const toastHeader = toastEl.querySelector('.toast-header');
    const toastBody = toastEl.querySelector('.toast-body');
    
    toastBody.textContent = message;
    
    // Update header color
    toastHeader.classList.remove('bg-success', 'bg-danger', 'bg-warning', 'bg-info');
    if (type !== 'info') {
      toastHeader.classList.add(`bg-${type}`, 'text-white');
    }
    
    toastInstance.show();
  } else {
    // Fallback to alert if toast not available
    alert(message);
  }
}

/* ------------------------------------------------------------------
   HELPER UTILITIES
   ------------------------------------------------------------------ */

function formatDate(dateString) {
  if (!dateString) return "N/A";
  const d = new Date(dateString);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function getStatusBadgeClass(s) {
  return {
    open: "badge-open",
    investigation: "badge-investigation",
    resolved: "badge-resolved",
    priority: "badge-priority"
  }[s] || "badge-open";
}

function getOfficerStatusBadge(s) {
  return {
    available: "bg-success",
    on_call: "bg-warning",
    off_duty: "bg-danger",
    on_leave: "bg-secondary",
    training: "bg-info",
    active: "bg-success"
  }[s] || "bg-secondary";
}

/* ------------------------------------------------------------------
   SIDEBAR / NAVIGATION
   ------------------------------------------------------------------ */

function initNavigation() {
  // Sidebar links
  document.querySelectorAll('#sidebar a[data-section]').forEach(link => {
    link.addEventListener('click', async e => {
      e.preventDefault();
      await switchSection(link.dataset.section);
    });
  });

  // "View All" buttons
  document.querySelectorAll('a[data-section]').forEach(link => {
    if (!link.closest('#sidebar')) {
      link.addEventListener('click', async e => {
        e.preventDefault();
        await switchSection(link.dataset.section);
      });
    }
  });

  // Sidebar collapse button
  const collapseBtn = document.getElementById('sidebarCollapse');
  collapseBtn?.addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('collapsed');
  });

  // Logout button
  document.querySelectorAll('[data-action="logout"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      handleLogout();
    });
  });
}

/* ------------------------------------------------------------------
   LOGOUT HANDLER
   ------------------------------------------------------------------ */

function handleLogout() {
  if (confirm('Are you sure you want to logout?')) {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    showToast('Logging out...');
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 500);
  }
}

/* ------------------------------------------------------------------
   SECTION SWITCHING
   ------------------------------------------------------------------ */

async function switchSection(sectionId) {
  document.querySelectorAll('#sidebar li').forEach(li => li.classList.remove('active'));
  document
    .querySelector(`#sidebar a[data-section="${sectionId}"]`)
    ?.parentElement.classList.add('active');

  document.querySelectorAll('.section-content').forEach(sec => sec.classList.remove('active'));
  const target = document.getElementById(sectionId);
  if (target) target.classList.add('active');

  currentSection = sectionId;
  await loadSectionData(sectionId);
  showToast(`Viewing ${sectionId} section`);
}

/* ------------------------------------------------------------------
   LOAD SECTION DATA
   ------------------------------------------------------------------ */

async function loadSectionData(sectionId) {
  switch (sectionId) {
    case "dashboard":
      await loadDashboard();
      break;
    case "cases":
      await loadCases();
      break;
    case "reports":
      await loadReports();
      break;
    case "personnel":
      await loadPersonnel();
      break;
    case "settings":
      await loadUsers();
      break;
    case "map":
      await loadIncidents();
      await updateMapStatistics();
      break;
    case "analytics":
      await loadAnalytics();
      break;
  }
}

/* ------------------------------------------------------------------
   DASHBOARD - COMPLETE BACKEND INTEGRATION WITH DEBUGGING
   ------------------------------------------------------------------ */

async function loadDashboard() {
  try {
    console.log('Loading dashboard data...');
    
    // Show loading state is already in HTML
    
    // Load all dashboard data in parallel with individual error handling
    const results = await Promise.allSettled([
      api.fetchDashboardStatistics(),
      api.fetchRecentActivity(5),
      api.fetchCaseDistribution(),
      api.fetchRecentCases(),
      api.fetchPersonnelStatus()
    ]);

    console.log('Dashboard API Results:', results);

    // Extract data from settled promises
    const [
      statisticsResult,
      activityResult,
      distributionResult,
      casesResult,
      personnelResult
    ] = results;

    // Update sections with available data
    if (statisticsResult.status === 'fulfilled') {
      console.log('Statistics loaded:', statisticsResult.value);
      updateStatisticsCards(statisticsResult.value);
    } else {
      console.error('Statistics failed:', statisticsResult.reason);
      showStatisticsError();
    }

    if (activityResult.status === 'fulfilled') {
      console.log('Activity loaded:', activityResult.value);
      renderRecentActivity(activityResult.value);
    } else {
      console.error('Activity failed:', activityResult.reason);
      renderRecentActivity([]);
    }

    if (distributionResult.status === 'fulfilled') {
      console.log('Distribution loaded:', distributionResult.value);
      renderCaseDistribution(distributionResult.value);
    } else {
      console.error('Distribution failed:', distributionResult.reason);
      renderCaseDistribution([]);
    }

    if (casesResult.status === 'fulfilled') {
      console.log('Recent cases loaded:', casesResult.value);
      renderRecentCases(casesResult.value);
    } else {
      console.error('Recent cases failed:', casesResult.reason);
      renderRecentCases([]);
    }

    if (personnelResult.status === 'fulfilled') {
      console.log('Personnel loaded:', personnelResult.value);
      renderPersonnelStatus(personnelResult.value);
    } else {
      console.error('Personnel failed:', personnelResult.reason);
      renderPersonnelStatus([]);
    }

    // Show success message if at least some data loaded
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    if (successCount > 0) {
      showToast(`Dashboard loaded (${successCount}/5 sections)`, "success");
    } else {
      showToast("Error loading dashboard data", "danger");
    }

  } catch (e) {
    console.error('Critical dashboard error:', e);
    showToast("Error loading dashboard: " + e.message, "danger");
    showErrorState();
  }
}

function updateStatisticsCards(statistics) {
  console.log('Updating statistics cards with:', statistics);
  
  if (!statistics) {
    console.warn('No statistics data received');
    showStatisticsError();
    return;
  }
  
  // Update Total Cases
  const totalCard = document.querySelector('.stat-card.cases .card-body');
  if (totalCard) {
    totalCard.innerHTML = `
      <div class="row no-gutters align-items-center">
        <div class="col mr-2">
          <div class="text-xs font-weight-bold text-uppercase mb-1">Total Cases</div>
          <div class="h5 mb-0 font-weight-bold">${statistics.total || 0}</div>
          <div class="mt-2">
            <small><i class="fas fa-database me-1"></i>All records</small>
          </div>
        </div>
        <div class="col-auto">
          <i class="fas fa-folder-open fa-2x text-white-50"></i>
        </div>
      </div>
    `;
  }
  
  // Update Open Cases
  const openCard = document.querySelector('.stat-card.open .card-body');
  if (openCard) {
    openCard.innerHTML = `
      <div class="row no-gutters align-items-center">
        <div class="col mr-2">
          <div class="text-xs font-weight-bold text-uppercase mb-1">Open Cases</div>
          <div class="h5 mb-0 font-weight-bold">${statistics.open || 0}</div>
          <div class="mt-2">
            <small><i class="fas fa-clock me-1"></i>Active</small>
          </div>
        </div>
        <div class="col-auto">
          <i class="fas fa-hourglass-half fa-2x text-white-50"></i>
        </div>
      </div>
    `;
  }
  
  // Update Closed/Resolved Cases
  const closedCard = document.querySelector('.stat-card.closed .card-body');
  if (closedCard) {
    const resolvedCount = statistics.resolved || statistics.closed || 0;
    closedCard.innerHTML = `
      <div class="row no-gutters align-items-center">
        <div class="col mr-2">
          <div class="text-xs font-weight-bold text-uppercase mb-1">Closed Cases</div>
          <div class="h5 mb-0 font-weight-bold">${resolvedCount}</div>
          <div class="mt-2">
            <small><i class="fas fa-check me-1"></i>Resolved</small>
          </div>
        </div>
        <div class="col-auto">
          <i class="fas fa-check-circle fa-2x text-white-50"></i>
        </div>
      </div>
    `;
  }
  
  // Update Priority Cases
  const priorityCard = document.querySelector('.stat-card.priority .card-body');
  if (priorityCard) {
    priorityCard.innerHTML = `
      <div class="row no-gutters align-items-center">
        <div class="col mr-2">
          <div class="text-xs font-weight-bold text-uppercase mb-1">Priority Cases</div>
          <div class="h5 mb-0 font-weight-bold">${statistics.priority || 0}</div>
          <div class="mt-2">
            <small><i class="fas fa-exclamation-circle me-1"></i>Urgent</small>
          </div>
        </div>
        <div class="col-auto">
          <i class="fas fa-exclamation-triangle fa-2x text-white-50"></i>
        </div>
      </div>
    `;
  }
  
  console.log('Statistics cards updated');
}

function renderRecentActivity(activities) {
  console.log('Rendering recent activity:', activities);
  
  // Find the Recent Activity card by searching through all cards
  const dashboardCards = document.querySelectorAll('#dashboard .card');
  let activityCardBody = null;
  
  for (const card of dashboardCards) {
    const header = card.querySelector('.card-header h6');
    if (header && header.textContent.includes('Recent Activity')) {
      activityCardBody = card.querySelector('.card-body');
      break;
    }
  }
  
  if (!activityCardBody) {
    console.error('Recent Activity card body not found');
    return;
  }

  if (!activities || activities.length === 0) {
    activityCardBody.innerHTML = `
      <div class="text-center py-4">
        <i class="fas fa-inbox fa-3x text-muted mb-3"></i>
        <p class="text-muted mb-0">No recent activity</p>
      </div>
    `;
    return;
  }

  activityCardBody.innerHTML = activities.map(activity => `
    <div class="activity-item ${activity.type || 'case'}">
      <div class="d-flex justify-content-between align-items-start">
        <h6 class="mb-1" style="color: #2c3e50;">${escapeHtml(activity.message || activity.description || 'Activity')}</h6>
        <small class="text-muted">${activity.timeAgo || 'Just now'}</small>
      </div>
      <p class="mb-0">
        <small class="text-muted">by ${escapeHtml(activity.user || activity.officer || 'Unknown')}</small>
      </p>
    </div>
  `).join('');
  
  console.log('Recent activity rendered');
}

function renderCaseDistribution(distribution) {
  console.log('Rendering case distribution:', distribution);
  
  // Find the Case Distribution table
  const dashboardCards = document.querySelectorAll('#dashboard .card');
  let distributionTbody = null;
  
  for (const card of dashboardCards) {
    const header = card.querySelector('.card-header h6');
    if (header && header.textContent.includes('Case Distribution')) {
      distributionTbody = card.querySelector('tbody');
      break;
    }
  }
  
  if (!distributionTbody) {
    console.error('Case Distribution table body not found');
    return;
  }

  if (!distribution || distribution.length === 0) {
    distributionTbody.innerHTML = `
      <tr>
        <td colspan="4" class="text-center py-4">
          <i class="fas fa-chart-pie fa-2x text-muted mb-2 d-block"></i>
          <span class="text-muted">No case data available</span>
        </td>
      </tr>
    `;
    return;
  }

  distributionTbody.innerHTML = distribution.map(item => {
    const trendDirection = item.trendDirection || (item.trend > 0 ? 'up' : item.trend < 0 ? 'down' : 'stable');
    const trendIcon = trendDirection === 'up' 
      ? '<i class="fas fa-arrow-up text-danger"></i>'
      : trendDirection === 'down'
      ? '<i class="fas fa-arrow-down text-success"></i>'
      : '<i class="fas fa-minus text-secondary"></i>';

    const resolutionRate = item.resolutionRate || 0;
    const progressColor = resolutionRate >= 70 
      ? 'bg-success' 
      : resolutionRate >= 50 
      ? 'bg-warning' 
      : 'bg-danger';

    return `
      <tr>
        <td>${escapeHtml(item.type || item.caseType || 'Unknown')}</td>
        <td>${item.count || 0}</td>
        <td>${trendIcon} ${Math.abs(item.trend || 0)}%</td>
        <td>
          <div class="progress" style="height: 8px;">
            <div class="progress-bar ${progressColor}" 
                 role="progressbar" 
                 style="width: ${resolutionRate}%" 
                 aria-valuenow="${resolutionRate}" 
                 aria-valuemin="0" 
                 aria-valuemax="100">
            </div>
          </div>
          <small class="ms-2">${resolutionRate}%</small>
        </td>
      </tr>
    `;
  }).join('');
  
  console.log('Case distribution rendered');
}

function renderRecentCases(cases) {
  console.log('Rendering recent cases:', cases);
  
  // Find the Recent Cases table
  const dashboardCards = document.querySelectorAll('#dashboard .card');
  let recentCasesTbody = null;
  
  for (const card of dashboardCards) {
    const header = card.querySelector('.card-header h6');
    if (header && header.textContent.includes('Recent Cases')) {
      recentCasesTbody = card.querySelector('tbody');
      break;
    }
  }
  
  if (!recentCasesTbody) {
    console.error('Recent Cases table body not found');
    return;
  }

  if (!cases || cases.length === 0) {
    recentCasesTbody.innerHTML = `
      <tr>
        <td colspan="4" class="text-center py-4">
          <i class="fas fa-folder-open fa-2x text-muted mb-2 d-block"></i>
          <span class="text-muted">No recent cases</span>
        </td>
      </tr>
    `;
    return;
  }

  recentCasesTbody.innerHTML = cases.map(c => `
    <tr class="${c.priority === 'high' ? 'priority-high' : ''}">
      <td>${escapeHtml(c.caseId || c.id || 'N/A')}</td>
      <td>${escapeHtml(c.type || c.caseType || 'Unknown')}</td>
      <td><span class="badge ${getStatusBadgeClass(c.status)}">${escapeHtml(c.status || 'open')}</span></td>
      <td>${escapeHtml(resolveOfficerName(c))}</td>
    </tr>
  `).join('');
  
  console.log('Recent cases rendered');
}

function renderPersonnelStatus(personnel) {
  console.log('Rendering personnel status:', personnel);
  
  // Find the Personnel Status table
  const dashboardCards = document.querySelectorAll('#dashboard .card');
  let personnelTbody = null;
  
  for (const card of dashboardCards) {
    const header = card.querySelector('.card-header h6');
    if (header && header.textContent.includes('Personnel Status')) {
      personnelTbody = card.querySelector('tbody');
      break;
    }
  }
  
  if (!personnelTbody) {
    console.error('Personnel Status table body not found');
    return;
  }

  if (!personnel || personnel.length === 0) {
    personnelTbody.innerHTML = `
      <tr>
        <td colspan="4" class="text-center py-4">
          <i class="fas fa-user-friends fa-2x text-muted mb-2 d-block"></i>
          <span class="text-muted">No personnel data available</span>
        </td>
      </tr>
    `;
    return;
  }

  personnelTbody.innerHTML = personnel.map(o => {
    const officerName = o.name || `${o.firstName || ''} ${o.lastName || ''}`.trim() || 'Unknown';
    const displayName = o.lastName || officerName.split(' ').pop() || 'Officer';
    
    return `
      <tr>
        <td>
          <div class="d-flex align-items-center">
            <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(officerName)}&background=3498db&color=fff"
                 class="user-avatar me-2" 
                 alt="${escapeHtml(officerName)}">
            <div>Officer ${escapeHtml(displayName)}</div>
          </div>
        </td>
        <td>${o.badge || o.badgeNumber || 'N/A'}</td>
        <td><span class="badge ${getOfficerStatusBadge(o.status)}">${escapeHtml(o.status || 'active')}</span></td>
        <td>${o.activeCases || o.active_cases || 0}</td>
      </tr>
    `;
  }).join('');
  
  console.log('Personnel status rendered');
}

// Helper function to show statistics error
function showStatisticsError() {
  document.querySelectorAll('.stat-card .card-body').forEach(card => {
    card.innerHTML = `
      <div class="row no-gutters align-items-center">
        <div class="col mr-2">
          <div class="text-xs font-weight-bold text-uppercase mb-1">Error</div>
          <div class="h5 mb-0 font-weight-bold">--</div>
          <div class="mt-2">
            <small class="text-danger"><i class="fas fa-exclamation-triangle me-1"></i>Loading failed</small>
          </div>
        </div>
        <div class="col-auto">
          <i class="fas fa-times-circle fa-2x text-white-50"></i>
        </div>
      </div>
    `;
  });
}

// Helper function to show error state (keep existing but enhance)
function showErrorState() {
  console.error('Showing error state across dashboard');
  showStatisticsError();
}

// Helper function to escape HTML (keep existing)
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

/* ------------------------------------------------------------------
   OFFICER NAME RESOLVER 
------------------------------------------------------------------ */
function resolveOfficerName(caseData) {
  if (!caseData) return 'Unassigned';
  
  // Your backend ALWAYS returns officer as a string
  // It's already formatted as: "name" or "username" or "Unassigned"

  if (typeof caseData.officer === 'string') {
    return caseData.officer;
  }
  
  // Fallback (should never happen with your backend)
  return 'Unassigned';

}

/**
 * Sets the officer dropdown value intelligently
 * Matches against option values and text content
 */

function setOfficerDropdown(selectElement, officerValue) {
  if (!selectElement || !officerValue || officerValue === 'Unassigned') {
    selectElement.value = '';
    return;
  }
  
  // officerValue is a string name like "Rodriguez"
  // We need to find the matching option by TEXT content
  
  const needle = String(officerValue).toLowerCase().trim();
  let matchFound = false;
  
  Array.from(selectElement.options).forEach(opt => {
    const optText = opt.text.toLowerCase();
    
    // Match if option text contains the officer name
    if (optText.includes(needle) || needle.includes(optText.toLowerCase())) {
      selectElement.value = opt.value;
      matchFound = true;
      console.log(`Matched "${officerValue}" to option:`, opt.text, 'value:', opt.value);
    }
  });
  
  if (!matchFound) {
    console.warn(`⚠️ Could not match officer "${officerValue}" to any dropdown option`);
  }
}

/* ------------------------------------------------------------------ */

// Debug function 
window.debugDashboard = async function() {
  console.log('DASHBOARD DEBUG MODE');
  console.log('='.repeat(50));
  
  try {
    console.log('1ï¸Testing Statistics API...');
    const stats = await api.fetchDashboardStatistics();
    console.log('   Statistics:', stats);
  } catch (e) {
    console.error('   Statistics Error:', e);
  }
  
  try {
    console.log('2ï¸Testing Recent Activity API...');
    const activity = await api.fetchRecentActivity(5);
    console.log('   Activity:', activity);
  } catch (e) {
    console.error('   Activity Error:', e);
  }
  
  try {
    console.log('3ï¸Testing Case Distribution API...');
    const distribution = await api.fetchCaseDistribution();
    console.log('   Distribution:', distribution);
  } catch (e) {
    console.error('   Distribution Error:', e);
  }
  
  try {
    console.log('4ï¸Testing Recent Cases API...');
    const cases = await api.fetchRecentCases();
    console.log('   Cases:', cases);
  } catch (e) {
    console.error('   Cases Error:', e);
  }
  
  try {
    console.log('5ï¸Testing Personnel Status API...');
    const personnel = await api.fetchPersonnelStatus();
    console.log('   Personnel:', personnel);
  } catch (e) {
    console.error('   Personnel Error:', e);
  }
  
  console.log('='.repeat(50));
  console.log('Debug complete - check results above');
};

// Export for console debugging
window.dashboardDebug = {
  loadDashboard,
  updateStatisticsCards,
  renderRecentActivity,
  renderCaseDistribution,
  renderRecentCases,
  renderPersonnelStatus
};


/* ------------------------------------------------------------------
   CASES PAGE
   ------------------------------------------------------------------ */

async function loadCases() {
  try {
    allCases = await api.fetchCases();
    renderCasesTable();
  } catch (e) {
    console.error(e);
    showToast("Could not load cases", "danger");
  }
}

/* ------------------------------------------------------------------
   DYNAMIC OFFICER DROPDOWN POPULATION
   ------------------------------------------------------------------ */

async function populateOfficerDropdown() {
  try {
    // Fetch all users with officer role
    const users = await api.fetchUsers();
    console.log("exact sql response:", users);
    const officers = users.filter(u => u.role === 'officer' || u.role === 'admin');
    
    const dropdown = document.getElementById('caseOfficer');
    if (!dropdown) return;
    
    // Clear existing options except the first one
    dropdown.innerHTML = '<option value="">Select Officer</option>';
    
    // Add officers dynamically
    officers.forEach(officer => {
      const option = document.createElement('option');
      option.value = officer.id; // user ID as value
      option.textContent = officer.name || officer.username;
      dropdown.appendChild(option);
    });
    
    console.log('Officer dropdown populated with', officers.length, 'officers');
    
  } catch (e) {
    console.error('Error populating officer dropdown:', e);
  }
}


function renderCasesTable() {
  const tbody = document.querySelector("#casesTable tbody");
  if (!tbody) return;

  // 🔍 DEBUG
  if (allCases.length > 0) {
    console.log('🔍 First case:', allCases[0]);
    console.log('🔍 Officer value:', allCases[0].officer);
    console.log('🔍 Officer type:', typeof allCases[0].officer);
  }

  let filtered = allCases.filter(c => {
    if (caseFilters.status && c.status !== caseFilters.status) return false;
    if (caseFilters.type && c.type.toLowerCase() !== caseFilters.type.toLowerCase()) return false;
    if (caseFilters.priority && c.priority !== caseFilters.priority) return false;
    
    // Use resolver for officer filter
    if (caseFilters.officer) {
      const officerName = resolveOfficerName(c).toLowerCase();
      if (!officerName.includes(caseFilters.officer.toLowerCase())) return false;
    }
    
    if (caseFilters.search) {
      const s = caseFilters.search.toLowerCase();
      const officerName = resolveOfficerName(c).toLowerCase();
      return (
        c.caseId.toLowerCase().includes(s) ||
        c.type.toLowerCase().includes(s) ||
        c.location.toLowerCase().includes(s) ||
        officerName.includes(s)
      );
    }
    return true;
  });

  const start = (currentPage.cases - 1) * ITEMS_PER_PAGE;
  const pageData = filtered.slice(start, start + ITEMS_PER_PAGE);

  tbody.innerHTML = pageData.map(c => {
    const officerDisplay = resolveOfficerName(c);
    
    return `
      <tr class="${c.priority === "high" ? "priority-high" : ""}" data-case-id="${c.caseId}">
        <td>${c.caseId}</td>
        <td>${c.type}</td>
        <td>${formatDate(c.reported)}</td>
        <td>${c.location}</td>
        <td><span class="badge ${getStatusBadgeClass(c.status)}">${c.status}</span></td>
        <td>${officerDisplay}</td>
        <td class="action-buttons">
          <button class="btn btn-sm btn-primary" onclick="window.editCase('${c.caseId}')"><i class="fas fa-edit"></i></button>
          <button class="btn btn-sm btn-info" onclick="window.viewCase('${c.caseId}')"><i class="fas fa-eye"></i></button>
          <button class="btn btn-sm btn-danger ${currentUser?.role !== "admin" ? "d-none" : ""}"
                  onclick="window.deleteCase('${c.caseId}')"><i class="fas fa-trash"></i></button>
        </td>
      </tr>
    `;
  }).join("");

  renderPagination("cases", filtered.length);
}

/* ------------------------------------------------------------------
   PERSONNEL PAGE
   ------------------------------------------------------------------ */

async function loadPersonnel() {
  try {
    allOfficers = await api.fetchOfficers();
    renderPersonnelTable();
  } catch (e) {
    console.error(e);
    showToast("Could not load personnel", "danger");
  }
}

function renderPersonnelTable() {
  const tbody = document.querySelector("#personnelTable tbody");
  if (!tbody) return;
  tbody.innerHTML = allOfficers.map(o => `
    <tr>
      <td>
        <div class="d-flex align-items-center">
          <img src="https://ui-avatars.com/api/?name=${o.firstName}+${o.lastName}&background=3498db&color=fff"
               class="user-avatar me-2" alt="${o.firstName} ${o.lastName}">
          <div>Officer ${o.lastName}</div>
        </div>
      </td>
      <td>${o.badge}</td>
      <td>${o.rank_}</td>
      <td>${o.unit}</td>
      <td><span class="badge ${getOfficerStatusBadge(o.status)}">${o.status}</span></td>
      <td>${o.activeCases}</td>
      <td class="action-buttons">
        <button class="btn btn-sm btn-primary" onclick="window.editOfficer(${o.badge})"><i class="fas fa-edit"></i></button>
        <button class="btn btn-sm btn-info" onclick="window.viewOfficer(${o.badge})"><i class="fas fa-eye"></i></button>
        <button class="btn btn-sm btn-danger ${currentUser?.role !== "admin" ? "d-none" : ""}"
                onclick="window.deleteOfficer(${o.badge})"><i class="fas fa-trash"></i></button>
      </td>
    </tr>
  `).join('');
}

/* ------------------------------------------------------------------
   REPORTS PAGE
   ------------------------------------------------------------------ */

async function loadReports() {
  try {
    allReports = await api.fetchReports();
    renderReportsTable();
  } catch (e) {
    console.error(e);
    showToast("Could not load reports", "danger");
  }
}

function renderReportsTable() {
  const tbody = document.querySelector("#reportsTable tbody");
  if (!tbody) return;
  tbody.innerHTML = allReports.map(r => `
    <tr>
      <td>${r.reportId}</td>
      <td>${r.type}</td>
      <td>${r.generatedBy}</td>
      <td>${formatDate(r.date)}</td>
      <td class="action-buttons">
        <button class="btn btn-sm btn-info" onclick="window.viewReport('${r.reportId}')"><i class="fas fa-eye"></i></button>
        <button class="btn btn-sm btn-primary" onclick="window.downloadReport('${r.reportId}')"><i class="fas fa-download"></i></button>
        <button class="btn btn-sm btn-danger ${currentUser?.role !== "admin" ? "d-none" : ""}"
                onclick="window.deleteReport('${r.reportId}')"><i class="fas fa-trash"></i></button>
      </td>
    </tr>
  `).join('');
}

/* ------------------------------------------------------------------
   SETTINGS â†’ USER MANAGEMENT
   ------------------------------------------------------------------ */

async function loadUsers() {
  try {
    allUsers = await api.fetchUsers();
    renderUsersTable();
  } catch (e) {
    console.error(e);
    showToast("Could not load users", "danger");
  }
}

function renderUsersTable() {
  const tbody = document.querySelector("#settings .table tbody");
  if (!tbody) return;
  tbody.innerHTML = allUsers.map(u => `
    <tr>
      <td>${u.username}</td>
      <td>${u.role.charAt(0).toUpperCase() + u.role.slice(1)}</td>
      <td>${formatDate(u.lastLogin)}</td>
      <td><span class="badge ${u.status === "active" ? "bg-success" : "bg-secondary"}">${u.status}</span></td>
      <td class="action-buttons">
        <button class="btn btn-sm btn-primary ${currentUser?.role !== "admin" ? "d-none" : ""}"><i class="fas fa-edit"></i></button>
        <button class="btn btn-sm btn-danger ${currentUser?.role !== "admin" ? "d-none" : ""}"><i class="fas fa-trash"></i></button>
      </td>
    </tr>
  `).join('');
}

/* ------------------------------------------------------------------
   MAP SECTION
   ------------------------------------------------------------------ */

async function updateMapStatistics() {
  try {
    const stats = await api.fetchIncidentStatistics();
    const el1 = document.querySelector("#map .card:nth-of-type(1) h4");
    const el2 = document.querySelector("#map .card:nth-of-type(2) h4");
    const el4 = document.querySelector("#map .card:nth-of-type(4) h4");
    
    if (el1) el1.textContent = stats.priority;
    if (el2) el2.textContent = stats.active;
    if (el4) el4.textContent = stats.resolved;
  } catch (e) {
    console.error(e);
    showToast("Map statistics error", "danger");
  }
}


/* ------------------------------------------------------------------
   UNIFIED MODAL HANDLERS - Single source of truth
   ------------------------------------------------------------------ */

function initializeModals() {
  
  // ========================================================================
  // CASE MODAL - Handles both CREATE and UPDATE
  // ========================================================================
  
  document.getElementById('saveCase')?.addEventListener('click', async () => {
    const form = document.getElementById('caseForm');
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const caseData = {
      type: document.getElementById('caseType').value,
      priority: document.getElementById('casePriority').value,
      description: document.getElementById('caseDescription').value,
      location: document.getElementById('caseLocation').value,
      reporter: document.getElementById('caseReporter').value,
      officer: document.getElementById('caseOfficer').value,
      status: document.getElementById('caseStatus').value
    };

    try {
      // CHECK GLOBAL STATE - NO dataset dependencies
      if (editingCaseId) {
        console.log('Updating case:', editingCaseId);
        await api.updateCaseApi(editingCaseId, caseData);
        showToast(`Case ${editingCaseId} updated successfully`, "success");
      } else {
        console.log('Creating new case');
        const newCase = await api.createCase(caseData);
        showToast(`Case ${newCase.caseId} created successfully`, "success");
      }

      // Reset modal state
      const modal = bootstrap.Modal.getInstance(document.getElementById('newCaseModal'));
      modal.hide();
      form.reset();
      
      // CRITICAL: Clear global state
      editingCaseId = null;
      
      // Reset modal UI
      document.getElementById('newCaseModalLabel').textContent = 'Create New Case';
      document.getElementById('saveCase').textContent = 'Create Case';

      // Reload cases
      await loadCases();

    } catch (e) {
      console.error('Error saving case:', e);
      showToast('Error saving case: ' + e.message, "danger");
    }
  });

  // Reset case modal when closed
  document.getElementById('newCaseModal')?.addEventListener('hidden.bs.modal', () => {
    const form = document.getElementById('caseForm');
    form.reset();
    
    // CRITICAL: Always clear state on close
    editingCaseId = null;
    
    document.getElementById('newCaseModalLabel').textContent = 'Create New Case';
    document.getElementById('saveCase').textContent = 'Create Case';
  });

  document.getElementById('newCaseModal')?.addEventListener('show.bs.modal', async () => {
  await populateOfficerDropdown();
  });


  // ========================================================================
  // OFFICER MODAL - Create
  // ========================================================================
  
  document.getElementById('saveOfficer')?.addEventListener('click', async () => {
    const form = document.getElementById('officerForm');
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const officer = {
      firstName: document.getElementById('officerFirstName').value,
      lastName: document.getElementById('officerLastName').value,
      badge: document.getElementById('officerBadge').value,
      rank_: document.getElementById('officerRank').value,
      unit: document.getElementById('officerUnit').value,
      status: document.getElementById('officerStatus').value,
      email: document.getElementById('officerEmail').value
    };

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(officer.email)) {
      return showToast('Invalid email address', "danger");
    }

    try {
      await api.createOfficer(officer);
      const modal = bootstrap.Modal.getInstance(document.getElementById('addOfficerModal'));
      modal.hide();
      form.reset();
      await loadPersonnel();
      showToast(`Officer ${officer.firstName} ${officer.lastName} added`, "success");
    } catch (e) {
      console.error(e);
      showToast('Error adding officer', "danger");
    }
  });

  // ========================================================================
  // OFFICER MODAL - Update
  // ========================================================================
  
  document.getElementById('updateOfficer')?.addEventListener('click', async () => {
    const form = document.getElementById('editOfficerForm');
    
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const badge = document.getElementById('editOfficerBadge').value;
    const officerData = {
      firstName: document.getElementById('editOfficerFirstName').value,
      lastName: document.getElementById('editOfficerLastName').value,
      rank_: document.getElementById('editOfficerRank').value,
      unit: document.getElementById('editOfficerUnit').value,
      status: document.getElementById('editOfficerStatus').value,
      email: document.getElementById('editOfficerEmail').value
    };

    try {
      await api.updateOfficerApi(badge, officerData);
      
      const modal = bootstrap.Modal.getInstance(document.getElementById('editOfficerModal'));
      modal.hide();
      form.reset();
      
      await loadPersonnel();
      showToast(`Officer ${badge} updated successfully`, "success");

    } catch (e) {
      console.error('Error updating officer:', e);
      showToast('Error updating officer: ' + e.message, "danger");
    }
  });

  // ========================================================================
  // REPORT MODAL
  // ========================================================================
  
  document.getElementById('generateReport')?.addEventListener('click', async () => {
    const form = document.getElementById('reportForm');
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const report = {
      type: document.getElementById('reportType').value,
      generatedBy: currentUser?.name || 'Unknown',
      format: document.getElementById('reportFormat').value,
      notes: document.getElementById('reportNotes').value
    };

    try {
      const newReport = await api.generateReport(report);
      const modal = bootstrap.Modal.getInstance(document.getElementById('generateReportModal'));
      modal.hide();
      form.reset();
      await loadReports();
      showToast(`Report ${newReport.reportId} generated`, "success");
    } catch (e) {
      console.error(e);
      showToast('Error generating report', "danger");
    }
  });

  // ========================================================================
  // INCIDENT MODAL
  // ========================================================================
  
  document.getElementById('saveIncident')?.addEventListener('click', async () => {
    const form = document.getElementById('incidentForm');
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const incident = {
      type: document.getElementById('incidentType').value,
      priority: document.getElementById('incidentPriority').value,
      description: document.getElementById('incidentDescription').value,
      address: document.getElementById('incidentAddress').value,
      coordinates: document.getElementById('incidentCoordinates').value,
      reporter: document.getElementById('incidentReporter').value,
      status: document.getElementById('incidentStatus').value
    };

    try {
      await api.createIncident(incident);
      const modal = bootstrap.Modal.getInstance(document.getElementById('addIncidentModal'));
      modal.hide();
      form.reset();
      await updateMapStatistics();
      showToast('Incident added', "success");
    } catch (e) {
      console.error(e);
      showToast('Error adding incident', "danger");
    }
  });

  // ========================================================================
  // USER MODAL
  // ========================================================================
  
  document.getElementById('saveUser')?.addEventListener('click', async () => {
    const form = document.getElementById('userForm');
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const pwd = document.getElementById('userPassword').value;
    const pwd2 = document.getElementById('confirmPassword').value;
    if (pwd !== pwd2) return showToast('Passwords do not match', "danger");
    if (pwd.length < 6) return showToast('Password must be at least 6 characters', "danger");

    const email = document.getElementById('userEmail').value;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showToast('Invalid email', "danger");

    const user = {
      username: document.getElementById('username').value,
      name: document.getElementById('username').value,
      email,
      role: document.getElementById('userRole').value,
      password: pwd,
      department: 'General'
    };

    try {
      const newUser = await api.createUser(user);
      const modal = bootstrap.Modal.getInstance(document.getElementById('addUserModal'));
      modal.hide();
      form.reset();
      await loadUsers();
      showToast(`User ${newUser.username} added`, "success");
    } catch (e) {
      console.error(e);
      showToast('Error adding user', "danger");
    }
  });

  // ========================================================================
  // VIEW MODAL EDIT BUTTONS
  // ========================================================================
  
  document.getElementById('editFromView')?.addEventListener('click', () => {
    const caseId = document.getElementById('editFromView').dataset.caseId;
    const viewModal = bootstrap.Modal.getInstance(document.getElementById('viewCaseModal'));
    viewModal.hide();
    window.editCase(caseId);
  });

  document.getElementById('editOfficerFromView')?.addEventListener('click', () => {
    const badge = document.getElementById('editOfficerFromView').dataset.badge;
    const viewModal = bootstrap.Modal.getInstance(document.getElementById('viewOfficerModal'));
    viewModal.hide();
    window.editOfficer(badge);
  });

  document.getElementById('downloadReportFromView')?.addEventListener('click', () => {
    const reportId = document.getElementById('downloadReportFromView').dataset.reportId;
    window.downloadReport(reportId);
  });

}


/* ------------------------------------------------------------------
   CASE OPERATIONS - EDIT, VIEW, DELETE
   ------------------------------------------------------------------ */

// Global editing state
let editingCaseId = null;

/**
 * Edit Case - Opens modal with case data pre-populated
 */
window.editCase = async (caseId) => {
  try {
    console.log('Editing case:', caseId);
    const c = await api.fetchCaseById(caseId);

    if (!c) return showToast('Case not found', "danger");

    // SET GLOBAL STATE - Primary source of truth
    editingCaseId = caseId;

    // Populate form fields
    document.getElementById('caseType').value = c.type?.toLowerCase() || "";
    document.getElementById('casePriority').value = c.priority || "";
    document.getElementById('caseDescription').value = c.description || "";
    document.getElementById('caseLocation').value = c.location || "";
    document.getElementById('caseReporter').value = c.reporter || "";
    document.getElementById('caseStatus').value = c.status || "";

    // ROBUST OFFICER SELECTION
    const officerSelect = document.getElementById('caseOfficer');
    const officerValue = resolveOfficerName(c);
    setOfficerDropdown(officerSelect, officerValue);

    // Update modal UI
    document.getElementById('newCaseModalLabel').textContent = 'Edit Case';
    document.getElementById('saveCase').textContent = 'Update Case';

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('newCaseModal'));
    modal.show();

    console.log('Edit mode activated for:', caseId);

  } catch (e) {
    console.error('Error loading case:', e);
    showToast('Error loading case: ' + e.message, "danger");
  }
};

/**
 * View Case - Opens read-only modal with case details
 */
window.viewCase = async (caseId) => {
  try {
    console.log('Viewing case:', caseId);
    const c = await api.fetchCaseById(caseId);
    
    if (!c) {
      return showToast('Case not found', "danger");
    }

    // Populate view modal
    document.getElementById('viewCaseId').textContent = c.caseId;
    document.getElementById('viewCaseType').textContent = c.type;
    document.getElementById('viewCaseLocation').textContent = c.location;
    document.getElementById('viewCaseReporter').textContent = c.reporter || 'N/A';
    document.getElementById('viewCaseOfficer').textContent = resolveOfficerName(c);
    document.getElementById('viewCaseDescription').textContent = c.description || 'No description';
    document.getElementById('viewCaseReported').textContent = formatDate(c.reported);

    // Status badge
    const statusEl = document.getElementById('viewCaseStatus');
    statusEl.textContent = c.status;
    statusEl.className = `badge ${getStatusBadgeClass(c.status)}`;

    // Priority badge
    const priorityEl = document.getElementById('viewCasePriority');
    priorityEl.textContent = c.priority;
    priorityEl.className = `badge ${c.priority === 'high' ? 'bg-danger' : c.priority === 'medium' ? 'bg-warning' : 'bg-info'}`;

    // Store case ID for edit button
    document.getElementById('editFromView').dataset.caseId = caseId;

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('viewCaseModal'));
    modal.show();

  } catch (e) {
    console.error('Error viewing case:', e);
    showToast('Error loading case: ' + e.message, "danger");
  }
};

/**
 * Delete Case - Admin only
 */
window.deleteCase = async (caseId) => {
  if (currentUser?.role !== "admin") {
    return showToast('Only admins can delete cases', "danger");
  }
  
  if (!confirm(`Are you sure you want to delete case ${caseId}? This action cannot be undone.`)) {
    return;
  }

  try {
    await api.deleteCaseApi(caseId);
    await loadCases();
    showToast(`Case ${caseId} deleted successfully`, "success");
  } catch (e) {
    console.error('Error deleting case:', e);
    showToast('Error deleting case: ' + e.message, "danger");
  }
};

/* ------------------------------------------------------------------
   OFFICER OPERATIONS - EDIT, VIEW, DELETE
   ------------------------------------------------------------------ */

/**
 * Edit Officer - Opens modal with officer data pre-populated
 */
window.editOfficer = async (badge) => {
  try {
    console.log('Editing officer:', badge);
    const officer = await api.fetchOfficerByBadge(badge);
    
    if (!officer) {
      return showToast('Officer not found', "danger");
    }

    // Populate form fields
    document.getElementById('editOfficerBadge').value = officer.badge;
    document.getElementById('editOfficerFirstName').value = officer.firstName;
    document.getElementById('editOfficerLastName').value = officer.lastName;
    document.getElementById('editOfficerRank').value = officer.rank_;
    document.getElementById('editOfficerUnit').value = officer.unit;
    document.getElementById('editOfficerStatus').value = officer.status;
    document.getElementById('editOfficerEmail').value = officer.email || '';

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('editOfficerModal'));
    modal.show();

  } catch (e) {
    console.error('Error loading officer:', e);
    showToast('Error loading officer: ' + e.message, "danger");
  }
};

/**
 * View Officer - Opens read-only modal with officer details
 */
window.viewOfficer = async (badge) => {
  try {
    console.log('Viewing officer:', badge);
    const officer = await api.fetchOfficerByBadge(badge);
    
    if (!officer) {
      return showToast('Officer not found', "danger");
    }

    // Populate view modal
    const fullName = `${officer.firstName} ${officer.lastName}`;
    document.getElementById('viewOfficerBadge').textContent = officer.badge;
    document.getElementById('viewOfficerName').textContent = fullName;
    document.getElementById('viewOfficerRank').textContent = officer.rank_;
    document.getElementById('viewOfficerUnit').textContent = officer.unit;
    document.getElementById('viewOfficerEmail').textContent = officer.email || 'N/A';
    document.getElementById('viewOfficerCases').textContent = officer.activeCases;
    
    // Status badge
    const statusEl = document.getElementById('viewOfficerStatus');
    statusEl.textContent = officer.status;
    statusEl.className = `badge ${getOfficerStatusBadge(officer.status)}`;

    // Avatar
    document.getElementById('viewOfficerAvatar').src = 
      `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=3498db&color=fff&size=100`;

    // Store badge for edit button
    document.getElementById('editOfficerFromView').dataset.badge = badge;

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('viewOfficerModal'));
    modal.show();

  } catch (e) {
    console.error('Error viewing officer:', e);
    showToast('Error loading officer: ' + e.message, "danger");
  }
};

/**
 * Delete Officer - Admin only
 */
window.deleteOfficer = async (badge) => {
  if (currentUser?.role !== "admin") {
    return showToast('Only admins can delete officers', "danger");
  }
  
  if (!confirm(`Are you sure you want to delete officer ${badge}? This action cannot be undone.`)) {
    return;
  }

  try {
    await api.deleteOfficerApi(badge);
    await loadPersonnel();
    showToast(`Officer ${badge} deleted successfully`, "success");
  } catch (e) {
    console.error('Error deleting officer:', e);
    showToast('Error deleting officer: ' + e.message, "danger");
  }
};

/* ------------------------------------------------------------------
   REPORT OPERATIONS - VIEW, DOWNLOAD, DELETE
   ------------------------------------------------------------------ */

/**
 * View Report - Opens read-only modal with report details
 */
window.viewReport = async (reportId) => {
  try {
    console.log('Viewing report:', reportId);
    const report = await api.fetchReportById(reportId);
    
    if (!report) {
      return showToast('Report not found', "danger");
    }

    // Populate view modal
    document.getElementById('viewReportId').textContent = report.reportId;
    document.getElementById('viewReportType').textContent = report.type;
    document.getElementById('viewReportGeneratedBy').textContent = report.generatedBy;
    document.getElementById('viewReportDate').textContent = formatDate(report.date);
    document.getElementById('viewReportFormat').textContent = report.format || 'PDF';
    document.getElementById('viewReportNotes').textContent = report.notes || 'No notes available';

    // Store report ID for download button
    document.getElementById('downloadReportFromView').dataset.reportId = reportId;

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('viewReportModal'));
    modal.show();

  } catch (e) {
    console.error('Error viewing report:', e);
    showToast('Error loading report: ' + e.message, "danger");
  }
};

/**
 * Download Report as PDF
 */
window.downloadReport = async (reportId) => {
  try {
    console.log('Downloading report:', reportId);
    
    // Show loading state
    const btn = event?.target.closest('button');
    if (btn) {
      const originalHTML = btn.innerHTML;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Downloading...';
      btn.disabled = true;
    }

    // Note: This is a placeholder for PDF generation
    // You'll need to implement actual PDF generation on the backend
    showToast('PDF download feature - Backend implementation required', "info");
    
    // Simulated download (replace with actual API call when backend is ready)
    setTimeout(() => {
      showToast(`Report ${reportId} download started`, "success");
      if (btn) {
        btn.innerHTML = originalHTML;
        btn.disabled = false;
      }
    }, 1000);

    /* When backend PDF route is ready, use this: */
    const response = await fetch(`https://npf-crm.onrender.com/api/reports/${reportId}/pdf`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });
    
    if (!response.ok) throw new Error('PDF download failed');
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportId}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  

  } catch (e) {
    console.error('Error downloading report:', e);
    showToast('Error downloading report: ' + e.message, "danger");
  }
};

/**
 * Delete Report - Admin only
 */
window.deleteReport = async (reportId) => {
  if (currentUser?.role !== "admin") {
    return showToast('Only admins can delete reports', "danger");
  }
  
  if (!confirm(`Are you sure you want to delete report ${reportId}? This action cannot be undone.`)) {
    return;
  }

  try {
    await api.deleteReportApi(reportId);
    await loadReports();
    showToast(`Report ${reportId} deleted successfully`, "success");
  } catch (e) {
    console.error('Error deleting report:', e);
    showToast('Error deleting report: ' + e.message, "danger");
  }
};

/* ------------------------------------------------------------------
   INCIDENTS PAGE
   ------------------------------------------------------------------ */

let allIncidents = [];

async function loadIncidents() {
  try {
    console.log('Loading incidents...');
    allIncidents = await api.fetchIncidents();
    renderIncidentsTable();
    await updateMapStatistics();
  } catch (e) {
    console.error('Error loading incidents:', e);
    showToast("Could not load incidents", "danger");
  }
}

function renderIncidentsTable() {
  // Note: Add an incidents table to your HTML if not present
  const tbody = document.querySelector("#incidentsTable tbody");
  if (!tbody) {
    console.warn('Incidents table not found in HTML');
    return;
  }

  if (!allIncidents || allIncidents.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-4">
          <i class="fas fa-map-marker-alt fa-2x text-muted mb-2 d-block"></i>
          <span class="text-muted">No incidents found</span>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = allIncidents.map(incident => `
    <tr>
      <td>${incident.id}</td>
      <td>${incident.type}</td>
      <td>${incident.address}</td>
      <td><span class="badge ${incident.priority === 'high' ? 'bg-danger' : incident.priority === 'medium' ? 'bg-warning' : 'bg-info'}">${incident.priority}</span></td>
      <td><span class="badge ${incident.status === 'active' ? 'bg-warning' : incident.status === 'resolved' ? 'bg-success' : 'bg-secondary'}">${incident.status}</span></td>
      <td>${formatDate(incident.timestamp)}</td>
    </tr>
  `).join('');
}

/* ------------------------------------------------------------------
   ANALYTICS PAGE
   ------------------------------------------------------------------ */

async function loadAnalytics() {
  try {
    console.log('Loading analytics...');
    
    // Fetch case statistics for analytics
    const caseStats = await api.fetchCaseStatistics();
    const officerStats = await api.fetchOfficerStatistics();
    
    // Update analytics displays (customize based on your HTML structure)
    console.log('Analytics data:', { caseStats, officerStats });
    
    showToast("Analytics loaded successfully", "success");
  } catch (e) {
    console.error('Error loading analytics:', e);
    showToast("Could not load analytics", "danger");
  }
}





/* ------------------------------------------------------------------
   PAGINATION
   ------------------------------------------------------------------ */

function renderPagination(section, totalItems) {
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  if (totalPages <= 1) return;

  let container = document.querySelector(`#${section} .pagination-container`);
  if (!container) {
    container = document.createElement('div');
    container.className = 'pagination-container d-flex justify-content-center mt-3';
    document.querySelector(`#${section} .card`)?.appendChild(container);
  }

  let html = '<nav><ul class="pagination">';

  html += `<li class="page-item ${currentPage[section] === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage[section] - 1}" data-section="${section}">
              <i class="fas fa-chevron-left"></i>
            </a>
          </li>`;

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - currentPage[section]) <= 1) {
      html += `<li class="page-item ${i === currentPage[section] ? 'active' : ''}">
                 <a class="page-link" href="#" data-page="${i}" data-section="${section}">${i}</a>
               </li>`;
    } else if (i === 2 || i === totalPages - 1) {
      html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
    }
  }

  html += `<li class="page-item ${currentPage[section] === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage[section] + 1}" data-section="${section}">
              <i class="fas fa-chevron-right"></i>
            </a>
          </li>`;

  html += '</ul></nav>';
  container.innerHTML = html;

  container.querySelectorAll('a.page-link').forEach(a => {
    a.addEventListener('click', async e => {
      e.preventDefault();
      const newPage = Number(a.dataset.page);
      const sec = a.dataset.section;
      if (newPage < 1 || newPage > totalPages) return;
      currentPage[sec] = newPage;

      if (sec === 'cases') renderCasesTable();
      else if (sec === 'reports') renderReportsTable();
      else if (sec === 'personnel') renderPersonnelTable();
      else if (sec === 'users') renderUsersTable();
    });
  });
}

/* ------------------------------------------------------------------
   UPDATE USER INFO IN NAVBAR
   ------------------------------------------------------------------ */

function updateNavbarUserInfo() {
  if (currentUser) {
    // Update user name in navbar
    const nameEl = document.querySelector('.navbar .dropdown-toggle span');
    if (nameEl) {
      nameEl.textContent = currentUser.name || currentUser.username;
    }
    
    // Update avatar
    const avatarEl = document.querySelector('.navbar .user-avatar');
    if (avatarEl) {
      avatarEl.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name || currentUser.username)}&background=2c3e50&color=fff`;
    }
  }
}

/* ------------------------------------------------------------------
   ROLE-BASED UI
   ------------------------------------------------------------------ */

function applyRoleBasedUI() {
  if (currentUser?.role !== 'admin') {
    // Hide delete buttons
    document.querySelectorAll('.btn-danger').forEach(btn => {
      if (btn.querySelector('.fa-trash')) btn.classList.add('d-none');
    });

    // Hide "Add User" button in Settings
    const addUserBtn = document.querySelector('#settings button[data-bs-target="#addUserModal"]');
    if (addUserBtn) addUserBtn.classList.add('d-none');
    
    // Hide "Create User" link if exists
    document.querySelectorAll('a[href="create-user.html"]').forEach(link => {
      link.classList.add('d-none');
    });
  }
}

/* ------------------------------------------------------------------
   INITIALIZATION
   ------------------------------------------------------------------ */

document.addEventListener('DOMContentLoaded', async () => {
  console.log('NPF CRM Application starting...');
  console.log('👤 Logged in as:', currentUser?.name || currentUser?.username);
  
  initializeToast();
  initNavigation();
  initializeModals();
  updateNavbarUserInfo();
  
  await switchSection('dashboard');
  applyRoleBasedUI();

  showToast(`Welcome back, ${currentUser?.name || currentUser?.username}!`, "success");

  console.log('✅ NPF CRM Application loaded successfully');
});

/* ------------------------------------------------------------------
   EXPOSE FOR DEBUGGING
   ------------------------------------------------------------------ */
   
  window.NPF_CRM = {
    currentUser,
    switchSection,
    showToast,
    loadSectionData,
    getAllCases: () => allCases,
    getAllOfficers: () => allOfficers,
    getAllReports: () => allReports,
    getAllUsers: () => allUsers,
    logout: handleLogout
    
  };