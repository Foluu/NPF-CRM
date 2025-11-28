

const express = require('express');
const router = express.Router();
const officerController = require('../controllers/officer.controller.js');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');


router.get('/', authenticate, officerController.getOfficers);
router.get('/statistics', authenticate, officerController.getOfficerStatistics);
router.get('/:badge', authenticate, officerController.getOfficerByBadge);
router.post('/', authenticate, requireAdmin, officerController.createOfficer);
router.patch('/:badge', authenticate, requireAdmin, officerController.updateOfficer);
router.delete('/:badge', authenticate, requireAdmin, officerController.deleteOfficer);


module.exports = router;