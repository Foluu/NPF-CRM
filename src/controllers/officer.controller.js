

const { prisma } = require('../config/db');

/**
 * @route   GET /api/officers
 * @desc    Get all officers
 * @access  Private
 */
const getOfficers = async (req, res, next) => {
  try {
    const { status, unit, search } = req.query;

    // Build filter
    const where = {};
    if (status) where.status = status;
    if (unit) where.unit = { contains: unit, mode: 'insensitive' };
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { badge: isNaN(search) ? undefined : parseInt(search) }
      ].filter(Boolean);
    }

    const officers = await prisma.officer.findMany({
      where,
      orderBy: { badge: 'asc' }
    });

    res.json({
      success: true,
      data: officers,
      total: officers.length
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/officers/:badge
 * @desc    Get officer by badge number
 * @access  Private
 */

const getOfficerByBadge = async (req, res, next) => {
  try {
    const { badge } = req.params;

    const officer = await prisma.officer.findUnique({
      where: { badge: parseInt(badge) }
    });

    if (!officer) {
      return res.status(404).json({
        success: false,
        error: 'Officer not found',
        code: 'OFFICER_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: officer
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/officers
 * @desc    Create new officer
 * @access  Private (Admin)
 */
const createOfficer = async (req, res, next) => {
  try {
    const { badge, firstName, lastName, rank_, unit, status, email } = req.body;

    // Validation
    if (!badge || !firstName || !lastName || !rank_ || !unit || !email) {
      return res.status(400).json({
        success: false,
        error: 'Badge, first name, last name, rank, unit, and email are required',
        code: 'MISSING_FIELDS'
      });
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format',
        code: 'INVALID_EMAIL'
      });
    }

    // Create officer
    const officer = await prisma.officer.create({
      data: {
        badge: parseInt(badge),
        firstName,
        lastName,
        rank_,
        unit,
        status: status || 'available',
        email
      }
    });

    res.status(201).json({
      success: true,
      data: officer,
      message: 'Officer created successfully'
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/officers/:badge
 * @desc    Update officer
 * @access  Private (Admin)
 */
const updateOfficer = async (req, res, next) => {
  try {
    const { badge } = req.params;
    const { firstName, lastName, rank_, unit, status, email, activeCases } = req.body;

    // Build update data
    const data = {};
    if (firstName) data.firstName = firstName;
    if (lastName) data.lastName = lastName;
    if (rank_) data.rank_ = rank_;
    if (unit) data.unit = unit;
    if (status) data.status = status;
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid email format',
          code: 'INVALID_EMAIL'
        });
      }
      data.email = email;
    }
    if (activeCases !== undefined) data.activeCases = parseInt(activeCases);

    const officer = await prisma.officer.update({
      where: { badge: parseInt(badge) },
      data
    });

    res.json({
      success: true,
      data: officer,
      message: 'Officer updated successfully'
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/officers/:badge
 * @desc    Delete officer
 * @access  Private (Admin)
 */
const deleteOfficer = async (req, res, next) => {
  try {
    const { badge } = req.params;

    await prisma.officer.delete({
      where: { badge: parseInt(badge) }
    });

    res.json({
      success: true,
      message: 'Officer deleted successfully'
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/officers/statistics
 * @desc    Get officer statistics
 * @access  Private
 */
const getOfficerStatistics = async (req, res, next) => {
  try {
    const [total, available, onCall, offDuty] = await Promise.all([
      prisma.officer.count(),
      prisma.officer.count({ where: { status: 'available' } }),
      prisma.officer.count({ where: { status: 'on_call' } }),
      prisma.officer.count({ where: { status: 'off_duty' } })
    ]);

    res.json({
      success: true,
      data: {
        total,
        available,
        onCall,
        offDuty
      }
    });

  } catch (error) {
    next(error);
  }
};


module.exports = {
  getOfficers,
  getOfficerByBadge,
  createOfficer,
  updateOfficer,
  deleteOfficer,
  getOfficerStatistics
};