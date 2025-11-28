


const { prisma } = require('../config/db');

/**
 * @route   GET /api/incidents
 * @desc    Get all incidents
 * @access  Private
 */

const getIncidents = async (req, res, next) => {
  try {
    const { status, priority, search } = req.query;

    // Build filter
    const where = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (search) {
      where.OR = [
        { type: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    const incidents = await prisma.incident.findMany({
      where,
      orderBy: { timestamp: 'desc' }
    });

    res.json({
      success: true,
      data: incidents,
      total: incidents.length
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/incidents/:id
 * @desc    Get incident by ID
 * @access  Private
 */
const getIncidentById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const incident = await prisma.incident.findUnique({
      where: { id: parseInt(id) }
    });

    if (!incident) {
      return res.status(404).json({
        success: false,
        error: 'Incident not found',
        code: 'INCIDENT_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: incident
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/incidents
 * @desc    Create new incident
 * @access  Private
 */
const createIncident = async (req, res, next) => {
  try {
    const { type, priority, description, address, coordinates, reporter, status } = req.body;

    // Validation
    if (!type || !description || !address) {
      return res.status(400).json({
        success: false,
        error: 'Type, description, and address are required',
        code: 'MISSING_FIELDS'
      });
    }

    // Create incident
    const incident = await prisma.incident.create({
      data: {
        type,
        priority: priority || 'low',
        description,
        address,
        coordinates,
        reporter,
        status: status || 'active'
      }
    });

    res.status(201).json({
      success: true,
      data: incident,
      message: 'Incident created successfully'
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/incidents/:id
 * @desc    Update incident
 * @access  Private
 */
const updateIncident = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { type, priority, description, address, coordinates, reporter, status } = req.body;

    // Build update data
    const data = {};
    if (type) data.type = type;
    if (priority) data.priority = priority;
    if (description) data.description = description;
    if (address) data.address = address;
    if (coordinates !== undefined) data.coordinates = coordinates;
    if (reporter !== undefined) data.reporter = reporter;
    if (status) data.status = status;

    const incident = await prisma.incident.update({
      where: { id: parseInt(id) },
      data
    });

    res.json({
      success: true,
      data: incident,
      message: 'Incident updated successfully'
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/incidents/:id
 * @desc    Delete incident
 * @access  Private (Admin)
 */
const deleteIncident = async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.incident.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      success: true,
      message: 'Incident deleted successfully'
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/incidents/statistics
 * @desc    Get incident statistics
 * @access  Private
 */
const getIncidentStatistics = async (req, res, next) => {
  try {
    const [priority, active, resolved] = await Promise.all([
      prisma.incident.count({ where: { priority: 'high' } }),
      prisma.incident.count({ where: { status: 'active' } }),
      prisma.incident.count({ where: { status: 'resolved' } })
    ]);

    res.json({
      success: true,
      data: {
        priority,
        active,
        resolved
      }
    });

  } catch (error) {
    next(error);
  }
};


module.exports = {
  getIncidents,
  getIncidentById,
  createIncident,
  updateIncident,
  deleteIncident,
  getIncidentStatistics
};