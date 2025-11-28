
// src/routes/dashboardRoutes.js


const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller.js');
const { authenticate } = require('../middleware/auth');

/**
 * All dashboard routes require authentication
 * Base path: /api/dashboard
 */

// GET /api/dashboard/statistics
// Returns: { total, open, resolved, investigation, priority }

router.get('/statistics', authenticate, dashboardController.getDashboardStatistics);

// GET /api/dashboard/recent-activity?limit=10
// Returns: Array of recent activities with user, timestamp, timeAgo

router.get('/recent-activity', authenticate, dashboardController.getRecentActivity);

// GET /api/dashboard/case-distribution
// Returns: Array of case types with count, trend, trendDirection, resolutionRate

router.get('/case-distribution', authenticate, dashboardController.getCaseDistribution);

// GET /api/dashboard/recent-cases
// Returns: Array of 5 most recent cases with caseId, type, status, priority, officer

router.get('/recent-cases', authenticate, dashboardController.getRecentCases);

// GET /api/dashboard/personnel-status
// Returns: Array of 4 officers with badge, name, status, activeCases

router.get('/personnel-status', authenticate, dashboardController.getPersonnelStatus);


module.exports = router;