


const { prisma } = require('../config/db');

/**
 * Generate unique report ID
 */
const generateReportId = async () => {
  const lastReport = await prisma.report.findFirst({
    orderBy: { id: 'desc' },
    select: { reportId: true }
  });

  if (!lastReport) return 'RPT-1026';

  const lastNumber = parseInt(lastReport.reportId.split('-')[1]);
  return `RPT-${lastNumber + 1}`;
};

/**
 * @route   GET /api/reports
 * @desc    Get all reports
 * @access  Private
 */
const getReports = async (req, res, next) => {
  try {
    const { type, format, search } = req.query;

    // Build filter
    const where = {};
    if (type) where.type = { contains: type, mode: 'insensitive' };
    if (format) where.format = format;
    if (search) {
      where.OR = [
        { reportId: { contains: search, mode: 'insensitive' } },
        { type: { contains: search, mode: 'insensitive' } }
      ];
    }

    const reports = await prisma.report.findMany({
      where,
      include: {
        generatedBy: {
          select: {
            id: true,
            username: true,
            name: true
          }
        }
      },
      orderBy: { date: 'desc' }
    });

    // Format response
    const formattedReports = reports.map(r => ({
      reportId: r.reportId,
      type: r.type,
      generatedBy: r.generatedBy?.name || r.generatedBy?.username || 'Unknown',
      date: r.date,
      format: r.format,
      notes: r.notes
    }));

    res.json({
      success: true,
      data: formattedReports,
      total: formattedReports.length
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/reports/:id
 * @desc    Get report by ID
 * @access  Private
 */
const getReportById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const report = await prisma.report.findFirst({
      where: {
        OR: [
          { id: isNaN(id) ? undefined : parseInt(id) },
          { reportId: id }
        ]
      },
      include: {
        generatedBy: {
          select: {
            username: true,
            name: true
          }
        }
      }
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found',
        code: 'REPORT_NOT_FOUND'
      });
    }

    // Format response
    const formatted = {
      reportId: report.reportId,
      type: report.type,
      generatedBy: report.generatedBy?.name || report.generatedBy?.username || 'Unknown',
      date: report.date,
      format: report.format,
      notes: report.notes
    };

    res.json({
      success: true,
      data: formatted
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/reports
 * @desc    Generate new report
 * @access  Private
 */
const createReport = async (req, res, next) => {
  try {
    const { type, format, notes } = req.body;

    // Validation
    if (!type) {
      return res.status(400).json({
        success: false,
        error: 'Report type is required',
        code: 'MISSING_FIELDS'
      });
    }

    // Generate report ID
    const reportId = await generateReportId();

    // Create report
    const report = await prisma.report.create({
      data: {
        reportId,
        type,
        format: format || 'PDF',
        notes,
        generatedById: req.user.id
      },
      include: {
        generatedBy: {
          select: {
            username: true,
            name: true
          }
        }
      }
    });

    // Format response
    const formatted = {
      reportId: report.reportId,
      type: report.type,
      generatedBy: report.generatedBy?.name || report.generatedBy?.username || 'Unknown',
      date: report.date,
      format: report.format,
      notes: report.notes
    };

    res.status(201).json({
      success: true,
      data: formatted,
      message: 'Report generated successfully'
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/reports/:id
 * @desc    Delete report
 * @access  Private (Admin)
 */
const deleteReport = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Find report
    const existingReport = await prisma.report.findFirst({
      where: {
        OR: [
          { id: isNaN(id) ? undefined : parseInt(id) },
          { reportId: id }
        ]
      }
    });

    if (!existingReport) {
      return res.status(404).json({
        success: false,
        error: 'Report not found',
        code: 'REPORT_NOT_FOUND'
      });
    }

    await prisma.report.delete({
      where: { id: existingReport.id }
    });

    res.json({
      success: true,
      message: 'Report deleted successfully'
    });

  } catch (error) {
    next(error);
  }
};


/**
 * @route   GET /api/reports/:id/pdf
 * @desc    Download report as PDF
 * @access  Private
 */
const downloadReportPDF = async (req, res, next) => {
  try {
    const { id } = req.params;

    const report = await prisma.report.findFirst({
      where: {
        OR: [
          { id: isNaN(id) ? undefined : parseInt(id) },
          { reportId: id }
        ]
      },
      include: {
        generatedBy: {
          select: {
            username: true,
            name: true
          }
        }
      }
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found',
        code: 'REPORT_NOT_FOUND'
      });
    }

    // SIMPLE PDF GENERATION (requires no additional packages)
    // For production, consider using packages like 'pdfkit' or 'puppeteer'
    
    const pdfContent = `
    NPF CRM - Report Document
    ========================

    Report ID: ${report.reportId}
    Type: ${report.type}
    Generated By: ${report.generatedBy?.name || 'Unknown'}
    Date: ${new Date(report.date).toLocaleDateString()}
    Format: ${report.format}

    Notes:
    ${report.notes || 'No notes'}

    ---
    This is a simplified PDF representation.
    It can be customized to suite client's needs.
        `;

        // Set headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${report.reportId}.pdf"`);
        
        // Send as plain text (replace with actual PDF generation)
        res.send(pdfContent);

        // Log activity
        await prisma.activitylog.create({
          data: {
            message: `Report ${report.reportId} downloaded`,
            action: 'download_report',
            userId: req.user.id,
            metadata: JSON.stringify({ reportId: report.reportId })
          }
        }).catch(err => console.error('Failed to log activity:', err));

      } catch (error) {
        console.error('Download PDF error:', error);
        next(error);
      }
    };




// ============================================================================
//  MODULE EXPORTS
// ============================================================================

module.exports = {
  getReports,
  getReportById,
  createReport,
  deleteReport,
  downloadReportPDF 
};
// ============================================================================