// src/controllers/case.controller.js


const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Generate unique case ID
 */
const generateCaseId = async () => {
  const lastCase = await prisma.caseFile.findFirst({
    orderBy: { id: 'desc' },
    select: { caseId: true }
  });

  if (!lastCase) return 'CA-0001';

  const lastNumber = parseInt(lastCase.caseId.split('-')[1]);
  return `CA-${lastNumber + 1}`;
};

/**
 * @route   GET /api/cases
 * @desc    Get all cases with filters
 * @access  Private
 */
const getCases = async (req, res, next) => {
  try {
    const { status, type, priority, officer, search, page = 1, limit = 50 } = req.query;

    // Build filter
    const where = {};
    if (status) where.status = status;
    if (type) where.type = { contains: type, mode: 'insensitive' };
    if (priority) where.priority = priority;
    
    if (officer) {
      const officerUser = await prisma.user.findFirst({
        where: {
          OR: [
            { username: { contains: officer  } },
            { name: { contains: officer } }
          ]
        }
      });
      if (officerUser) where.officerId = officerUser.id;
    }

    if (search) {
      where.OR = [
        { caseId: { contains: search, mode: 'insensitive' } },
        { type: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    const cases = await prisma.caseFile.findMany({
      where,
      include: {
        officer: {
          select: {
            id: true,
            username: true,
            name: true
          }
        }
      },
      orderBy: { reported: 'desc' },
      skip: (page - 1) * limit,
      take: parseInt(limit)
    });

    // Format response to match frontend expectations
    const formattedCases = cases.map(c => ({
      caseId: c.caseId,
      type: c.type,
      reported: c.reported,
      location: c.location,
      status: c.status,
      priority: c.priority,
      officer: c.officer?.name || c.officer?.username || 'Unassigned',
      description: c.description,
      reporter: c.reporter
    }));

    const total = await prisma.caseFile.count({ where });

    res.json({
      success: true,
      data: formattedCases,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    });

  } catch (error) {
    console.error('Get cases error:', error);
    next(error);
  }
};

/**
 * @route   GET /api/cases/:id
 * @desc    Get case by ID
 * @access  Private
 */
const getCaseById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const caseData = await prisma.caseFile.findFirst({
      where: {
        OR: [
          { id: isNaN(id) ? undefined : parseInt(id) },
          { caseId: id }
        ]
      },
      include: {
        officer: {
          select: {
            id: true,
            username: true,
            name: true
          }
        }
      }
    });

    if (!caseData) {
      return res.status(404).json({
        success: false,
        error: 'Case not found',
        code: 'CASE_NOT_FOUND'
      });
    }

    // Format response
    const formatted = {
      caseId: caseData.caseId,
      type: caseData.type,
      reported: caseData.reported,
      location: caseData.location,
      status: caseData.status,
      priority: caseData.priority,
      officer: caseData.officer?.name || caseData.officer?.username || 'Unassigned',
      description: caseData.description,
      reporter: caseData.reporter
    };

    res.json({
      success: true,
      data: formatted
    });

  } catch (error) {
    console.error('Get case error:', error);
    next(error);
  }
};

/**
 * @route   POST /api/cases
 * @desc    Create new case
 * @access  Private
 */
const createCase = async (req, res, next) => {
  try {
    const { type, priority, description, location, reporter, officer, status } = req.body;

    // Validation
    if (!type || !location) {
      return res.status(400).json({
        success: false,
        error: 'Type and location are required',
        code: 'MISSING_FIELDS'
      });
    }

    // Generate case ID
    const caseId = await generateCaseId();

    // Find officer if specified
    let officerId = null;
    if (officer) {
      const officerUser = await prisma.user.findFirst({
        where: {
          OR: [
            { username: officer },
            { name: { contains: officer  } }
          ]
        }
      });
      if (officerUser) officerId = officerUser.id;
    }

    // Create case
    const newCase = await prisma.caseFile.create({
      data: {
        caseId,
        type,
        priority: priority || 'medium',
        description,
        location,
        reporter,
        status: status || 'open',
        officerId,
        createdById: req.user.id
      },
      include: {
        officer: {
          select: {
            username: true,
            name: true
          }
        }
      }
    });

    console.log('Case created:', newCase.caseId);

    // Log activity
    await prisma.activitylog.create({
      data: {
        message: `New case ${newCase.caseId} created: ${newCase.type} at ${newCase.location}`,
        action: 'create_case',
        userId: req.user.id,
        metadata: JSON.stringify({ caseId: newCase.caseId, type: newCase.type })
      }
    }).catch(err => console.error('Failed to log activity:', err));

    // Format response
    const formatted = {
      caseId: newCase.caseId,
      type: newCase.type,
      reported: newCase.reported,
      location: newCase.location,
      status: newCase.status,
      priority: newCase.priority,
      officer: newCase.officer?.name || newCase.officer?.username || 'Unassigned',
      description: newCase.description,
      reporter: newCase.reporter
    };

    res.status(201).json({
      success: true,
      data: formatted,
      message: 'Case created successfully'
    });

  } catch (error) {
    console.error('Create case error:', error);
    next(error);
  }
};

/**
 * @route   PATCH /api/cases/:id
 * @desc    Update case
 * @access  Private
 */
const updateCase = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { type, priority, description, location, reporter, officer, status } = req.body;

    // Find case
    const existingCase = await prisma.caseFile.findFirst({
      where: {
        OR: [
          { id: isNaN(id) ? undefined : parseInt(id) },
          { caseId: id }
        ]
      }
    });

    if (!existingCase) {
      return res.status(404).json({
        success: false,
        error: 'Case not found',
        code: 'CASE_NOT_FOUND'
      });
    }

    // Build update data
    const data = {};
    if (type) data.type = type;
    if (priority) data.priority = priority;
    if (description !== undefined) data.description = description;
    if (location) data.location = location;
    if (reporter !== undefined) data.reporter = reporter;
    if (status) data.status = status;

    // Find officer if specified
    if (officer !== undefined) {
      if (officer === '' || officer === null) {
        data.officerId = null;
      } else {
        const officerUser = await prisma.user.findFirst({
          where: {
            OR: [
              { username: officer },
              { name: { contains: officer  } }
            ]
          }
        });
        if (officerUser) data.officerId = officerUser.id;
      }
    }

    // Update case
    const updatedCase = await prisma.caseFile.update({
      where: { id: existingCase.id },
      data,
      include: {
        officer: {
          select: {
            username: true,
            name: true
          }
        }
      }
    });

    console.log('Case updated:', updatedCase.caseId);

    // Log activity
    await prisma.activitylog.create({
      data: {
        message: `Case ${updatedCase.caseId} updated`,
        action: 'update_case',
        userId: req.user.id,
        metadata: JSON.stringify({ caseId: updatedCase.caseId })
      }
    }).catch(err => console.error('Failed to log activity:', err));

    // Format response
    const formatted = {
      caseId: updatedCase.caseId,
      type: updatedCase.type,
      reported: updatedCase.reported,
      location: updatedCase.location,
      status: updatedCase.status,
      priority: updatedCase.priority,
      officer: updatedCase.officer?.name || updatedCase.officer?.username || 'Unassigned',
      description: updatedCase.description,
      reporter: updatedCase.reporter
    };

    res.json({
      success: true,
      data: formatted,
      message: 'Case updated successfully'
    });

  } catch (error) {
    console.error('Update case error:', error);
    next(error);
  }
};

/**
 * @route   DELETE /api/cases/:id
 * @desc    Delete case
 * @access  Private (Admin)
 */
const deleteCase = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Find case
    const existingCase = await prisma.caseFile.findFirst({
      where: {
        OR: [
          { id: isNaN(id) ? undefined : parseInt(id) },
          { caseId: id }
        ]
      }
    });

    if (!existingCase) {
      return res.status(404).json({
        success: false,
        error: 'Case not found',
        code: 'CASE_NOT_FOUND'
      });
    }

    await prisma.caseFile.delete({
      where: { id: existingCase.id }
    });

    console.log('Case deleted:', existingCase.caseId);

    res.json({
      success: true,
      message: 'Case deleted successfully'
    });

  } catch (error) {
    console.error('Delete case error:', error);
    next(error);
  }
};

/**
 * @route   GET /api/cases/statistics
 * @desc    Get case statistics
 * @access  Private
 */
const getCaseStatistics = async (req, res, next) => {
  try {
    const [total, open, investigation, resolved, priority] = await Promise.all([
      prisma.caseFile.count(),
      prisma.caseFile.count({ where: { status: 'open' } }),
      prisma.caseFile.count({ where: { status: 'investigation' } }),
      prisma.caseFile.count({ where: { status: 'resolved' } }),
      prisma.caseFile.count({ where: { priority: 'high' } })
    ]);

    res.json({
      success: true,
      data: {
        total,
        open,
        investigation,
        resolved,
        priority
      }
    });

  } catch (error) {
    console.error('Get statistics error:', error);
    next(error);
  }
};

module.exports = {
  getCases,
  getCaseById,
  createCase,
  updateCase,
  deleteCase,
  getCaseStatistics

};