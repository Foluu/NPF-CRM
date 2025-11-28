

const express = require('express');
const router = express.Router();
const incidentController = require('../controllers/incident.controller.js');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');


router.get('/', authenticate, incidentController.getIncidents);
router.get('/statistics', authenticate, incidentController.getIncidentStatistics);
router.get('/:id', authenticate, incidentController.getIncidentById);
router.post('/', authenticate, incidentController.createIncident);
router.patch('/:id', authenticate, incidentController.updateIncident);
router.delete('/:id', authenticate, requireAdmin, incidentController.deleteIncident);


module.exports = router;