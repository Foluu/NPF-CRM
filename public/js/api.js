// public/js/api.js
// Real API Integration Layer

const API_BASE_URL = 'https://npf-crm.onrender.com/api';

/**
 * Get auth token from localStorage
 */
const getToken = () => {
  return localStorage.getItem('authToken');
};

/**
 * Make authenticated API request
 */
async function apiRequest(endpoint, options = {}) {
  const token = getToken();
  
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  };

  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      // Handle token expiration
      if (response.status === 401) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        window.location.href = 'log_in.html';
        return;
      }
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    return data.data;

  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// ============================================================================
// AUTHENTICATION API
// ============================================================================

export const loginUser = async (username, password) => {
  try {
    console.log('🔐 Attempting login for:', username);
    
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();
    
    console.log('📡 Login response:', response.status, data);

    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }

    // Store token and user info
    if (data.data.token) {
      localStorage.setItem('authToken', data.data.token);
      localStorage.setItem('currentUser', JSON.stringify({
        id: data.data.id,
        username: data.data.username,
        name: data.data.name,
        role: data.data.role,
        department: data.data.department
      }));
      console.log('Login successful, token stored');
    }

    return data.data;

  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

export const logoutUser = () => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('currentUser');
  window.location.href = 'log_in.html';
};

export const changePassword = async (currentPassword, newPassword) => {
  return apiRequest('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword })
  });
};

export const getCurrentUser = () => {
  return apiRequest('/auth/me');
};

export const isAuthenticated = () => {
  return !!getToken();
};

// ============================================================================
// USER API
// ============================================================================

export const fetchUsers = () => {
  return apiRequest('/users');
};

export const fetchUserById = (id) => {
  return apiRequest(`/users/${id}`);
};

export const createUser = (userObj) => {
  return apiRequest('/users', {
    method: 'POST',
    body: JSON.stringify(userObj)
  });
};

export const updateUserApi = (id, updates) => {
  return apiRequest(`/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates)
  });
};

export const deleteUserApi = (id) => {
  return apiRequest(`/users/${id}`, {
    method: 'DELETE'
  });
};

// ============================================================================
// CASE API
// ============================================================================

export const fetchCases = () => {
  return apiRequest('/cases');
};

export const fetchCaseById = (caseId) => {
  return apiRequest(`/cases/${caseId}`);
};

export const createCase = (caseObj) => {
  return apiRequest('/cases', {
    method: 'POST',
    body: JSON.stringify(caseObj)
  });
};

export const updateCaseApi = (caseId, updates) => {
  return apiRequest(`/cases/${caseId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates)
  });
};

export const deleteCaseApi = (caseId) => {
  return apiRequest(`/cases/${caseId}`, {
    method: 'DELETE'
  });
};

export const fetchCaseStatistics = () => {
  return apiRequest('/cases/statistics');
};

// ============================================================================
// OFFICER API
// ============================================================================

export const fetchOfficers = () => {
  return apiRequest('/officers');
};

export const fetchOfficerByBadge = (badge) => {
  return apiRequest(`/officers/${badge}`);
};

export const createOfficer = (officerObj) => {
  return apiRequest('/officers', {
    method: 'POST',
    body: JSON.stringify(officerObj)
  });
};

export const updateOfficerApi = (badge, updates) => {
  return apiRequest(`/officers/${badge}`, {
    method: 'PATCH',
    body: JSON.stringify(updates)
  });
};

export const deleteOfficerApi = (badge) => {
  return apiRequest(`/officers/${badge}`, {
    method: 'DELETE'
  });
};

export const fetchOfficerStatistics = () => {
  return apiRequest('/officers/statistics');
};

// ============================================================================
// REPORT API
// ============================================================================

export const fetchReports = () => {
  return apiRequest('/reports');
};

export const generateReport = (reportObj) => {
  return apiRequest('/reports', {
    method: 'POST',
    body: JSON.stringify(reportObj)
  });
};

export const deleteReportApi = (reportId) => {
  return apiRequest(`/reports/${reportId}`, {
    method: 'DELETE'
  });
};

// ============================================================================
// INCIDENT API
// ============================================================================

export const fetchIncidents = () => {
  return apiRequest('/incidents');
};

export const createIncident = (incidentObj) => {
  return apiRequest('/incidents', {
    method: 'POST',
    body: JSON.stringify(incidentObj)
  });
};

export const fetchIncidentStatistics = () => {
  return apiRequest('/incidents/statistics');
};

// ============================================================================
// DASHBOARD API
// ============================================================================

export const fetchDashboardStatistics = () => {
  return apiRequest('/dashboard/statistics');
};

export const fetchRecentActivity = (limit = 10) => {
  return apiRequest(`/dashboard/recent-activity?limit=${limit}`);
};

export const fetchCaseDistribution = () => {
  return apiRequest('/dashboard/case-distribution');
};

export const fetchRecentCases = () => {
  return apiRequest('/dashboard/recent-cases');
};

export const fetchPersonnelStatus = () => {
  return apiRequest('/dashboard/personnel-status');
};

// ============================================================================
// REPORT API
// ============================================================================

export const fetchReportById = (reportId) => {
  return apiRequest(`/reports/${reportId}`);
};

export const downloadReportPDF = async (reportId) => {
  const token = getToken();
  
  try {
    const response = await fetch(`${API_BASE_URL}/reports/${reportId}/pdf`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('PDF download failed');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportId}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();

    return { success: true };
  } catch (error) {
    console.error('PDF download error:', error);
    throw error;
  }
};

// ============================================================================
// ANALYTICS API 
// ============================================================================

export const fetchAnalytics = () => {
  return apiRequest('/analytics');
};

export const fetchAnalyticsSummary = () => {
  return apiRequest('/analytics/summary');
};

export const fetchCaseTrends = (period = 'month') => {
  return apiRequest(`/analytics/case-trends?period=${period}`);
};

export const fetchOfficerPerformance = () => {
  return apiRequest('/analytics/officer-performance');
};

