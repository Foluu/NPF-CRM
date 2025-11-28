
// src/controllers/dashboard.controller.js



const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * @route   GET /api/dashboard/statistics
 * @desc    Get comprehensive dashboard statistics
 * @access  Private
 */
const getDashboardStatistics = async (req, res, next) => {
  try {
    // Get case statistics
    const [total, open, resolved, investigation, priority] = await Promise.all([
      prisma.caseFile.count(),
      prisma.caseFile.count({ where: { status: 'open' } }),
      prisma.caseFile.count({ where: { status: 'resolved' } }),
      prisma.caseFile.count({ where: { status: 'investigation' } }),
      prisma.caseFile.count({ where: { priority: 'high' } })
    ]);

    res.json({
      success: true,
      data: {
        total,
        open,
        resolved,
        investigation,
        priority
      }
    });

  } catch (error) {
    console.error('Get dashboard statistics error:', error);
    next(error);
  }
};

/**
 * @route   GET /api/dashboard/recent-activity
 * @desc    Get recent activity logs
 * @access  Private
 */
const getRecentActivity = async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;

    const activities = await prisma.activitylog.findMany({
      take: parseInt(limit),
      orderBy: { timestamp: 'desc' },
      include: {
        user: {
          select: {
            username: true,
            name: true
          }
        }
      }
    });

    // Format activities for frontend
    const formattedActivities = activities.map(activity => {
      // Calculate time ago
      const timeAgo = getTimeAgo(activity.timestamp);
      
      return {
        id: activity.id,
        message: activity.message,
        action: activity.action,
        user: activity.user?.name || activity.user?.username || 'System',
        timestamp: activity.timestamp,
        timeAgo: timeAgo,
        type: getActivityType(activity.action)
      };
    });

    res.json({
      success: true,
      data: formattedActivities
    });

  } catch (error) {
    console.error('Get recent activity error:', error);
    next(error);
  }
};

/**
 * @route   GET /api/dashboard/case-distribution
 * @desc    Get case distribution by type with statistics
 * @access  Private
 */
const getCaseDistribution = async (req, res, next) => {
  try {
    // Get all cases
    const allCases = await prisma.caseFile.findMany({
      select: {
        type: true,
        status: true,
        createdAt: true
      }
    });

    // Calculate current period (this month)
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    // Group by type and calculate statistics
    const caseTypes = {};
    
    allCases.forEach(c => {
      const type = c.type;
      if (!caseTypes[type]) {
        caseTypes[type] = {
          total: 0,
          resolved: 0,
          thisMonth: 0,
          lastMonth: 0
        };
      }
      
      caseTypes[type].total++;
      
      if (c.status === 'resolved') {
        caseTypes[type].resolved++;
      }
      
      const caseDate = new Date(c.createdAt);
      if (caseDate >= thisMonthStart) {
        caseTypes[type].thisMonth++;
      }
      if (caseDate >= lastMonthStart && caseDate <= lastMonthEnd) {
        caseTypes[type].lastMonth++;
      }
    });

    // Format for frontend
    const distribution = Object.entries(caseTypes).map(([type, stats]) => {
      // Calculate trend
      let trend = 0;
      let trendDirection = 'stable';
      
      if (stats.lastMonth > 0) {
        trend = Math.round(((stats.thisMonth - stats.lastMonth) / stats.lastMonth) * 100);
        trendDirection = trend > 0 ? 'up' : trend < 0 ? 'down' : 'stable';
      } else if (stats.thisMonth > 0) {
        trend = 100;
        trendDirection = 'up';
      }

      // Calculate resolution rate
      const resolutionRate = stats.total > 0 
        ? Math.round((stats.resolved / stats.total) * 100) 
        : 0;

      return {
        type: formatCaseType(type),
        count: stats.total,
        trend: Math.abs(trend),
        trendDirection,
        resolutionRate
      };
    });

    // Sort by count (descending)
    distribution.sort((a, b) => b.count - a.count);

    res.json({
      success: true,
      data: distribution
    });

  } catch (error) {
    console.error('Get case distribution error:', error);
    next(error);
  }
};

/**
 * @route   GET /api/dashboard/recent-cases
 * @desc    Get 5 most recent cases
 * @access  Private
 */
const getRecentCases = async (req, res, next) => {
  try {
    const recentCases = await prisma.caseFile.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        officer: {
          select: {
            name: true,
            username: true
          }
        }
      }
    });

    // Format for frontend
    const formattedCases = recentCases.map(c => ({
      caseId: c.caseId,
      type: c.type,
      status: c.status,
      priority: c.priority,
      officer: c.officer?.name || c.officer?.username || 'Unassigned',
      location: c.location
    }));

    res.json({
      success: true,
      data: formattedCases
    });

  } catch (error) {
    console.error('Get recent cases error:', error);
    next(error);
  }
};

/**
 * @route   GET /api/dashboard/personnel-status
 * @desc    Get personnel status overview
 * @access  Private
 */
const getPersonnelStatus = async (req, res, next) => {
  try {
    const officers = await prisma.officer.findMany({
      take: 4,
      orderBy: { activeCases: 'desc' },
      select: {
        badge: true,
        firstName: true,
        lastName: true,
        status: true,
        activeCases: true
      }
    });

    // Format for frontend
    const formattedOfficers = officers.map(o => ({
      badge: o.badge,
      name: `${o.firstName} ${o.lastName}`,
      firstName: o.firstName,
      lastName: o.lastName,
      status: o.status,
      activeCases: o.activeCases
    }));

    res.json({
      success: true,
      data: formattedOfficers
    });

  } catch (error) {
    console.error('Get personnel status error:', error);
    next(error);
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format case type for display
 */
function formatCaseType(type) {
  const typeMap = {
    'theft': 'Theft/Burglary',
    'assault': 'Assault',
    'vandalism': 'Vandalism',
    'traffic': 'Traffic Incidents',
    'drug': 'Drug-Related',
    'other': 'Other'
  };
  
  return typeMap[type] || type.charAt(0).toUpperCase() + type.slice(1);
}

/**
 * Get activity type for styling
 */

function getActivityType(action) {
  if (!action) return 'case';
  
  if (action.includes('create')) return 'case';
  if (action.includes('update')) return 'update';
  if (action.includes('delete')) return 'alert';
  if (action.includes('resolve') || action.includes('close')) return 'resolve';
  if (action.includes('login')) return 'case';
  
  return 'update';
}

/**
 * Calculate time ago from timestamp
 */

function getTimeAgo(timestamp) {
  const now = new Date();
  const past = new Date(timestamp);
  const diffMs = now - past;
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  return past.toLocaleDateString();
}

module.exports = {
  getDashboardStatistics,
  getRecentActivity,
  getCaseDistribution,
  getRecentCases,
  getPersonnelStatus

};