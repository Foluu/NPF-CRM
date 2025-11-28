


/**
 * Check if user has admin role
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'NO_AUTH'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Admin access required',
      code: 'FORBIDDEN'
    });
  }

  next();
};

/**
 * Check if user has admin or officer role
 */
const requireOfficerOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'NO_AUTH'
    });
  }

  if (req.user.role !== 'admin' && req.user.role !== 'officer') {
    return res.status(403).json({
      success: false,
      error: 'Officer or admin access required',
      code: 'FORBIDDEN'
    });
  }

  next();
};


module.exports = { requireAdmin, requireOfficerOrAdmin };