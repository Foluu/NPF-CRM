

const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller.js');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');


router.get('/', authenticate, requireAdmin, userController.getUsers);
router.get('/:id', authenticate, userController.getUserById);
router.post('/', authenticate, requireAdmin, userController.createUser);
router.patch('/:id', authenticate, userController.updateUser);
router.delete('/:id', authenticate, requireAdmin, userController.deleteUser);


module.exports = router;