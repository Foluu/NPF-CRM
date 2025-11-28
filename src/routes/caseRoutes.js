

const express = require('express');
const router = express.Router();
const caseController = require('../controllers/case.controller.js');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');


router.get('/', authenticate, caseController.getCases);
router.get('/statistics', authenticate, caseController.getCaseStatistics);
router.get('/:id', authenticate, caseController.getCaseById);
router.post('/', authenticate, caseController.createCase);
router.patch('/:id', authenticate, caseController.updateCase);
router.delete('/:id', authenticate, requireAdmin, caseController.deleteCase);


module.exports = router;