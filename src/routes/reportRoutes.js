

const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller.js');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');


router.get('/', authenticate, reportController.getReports);
router.get('/:id', authenticate, reportController.getReportById);
router.get('/:id/pdf', authenticate, reportController.downloadReportPDF);
router.post('/', authenticate, reportController.createReport);
router.delete('/:id', authenticate, requireAdmin, reportController.deleteReport);



module.exports = router;