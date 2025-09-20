const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin/adminController');
const customerController = require('../controllers/admin/customerControllers');
const { adminAuth } = require('../middlewares/auth');

// Admin Authentication
router.get('/login', adminController.loadLogin);
router.post('/login', adminController.login);
router.post('/logout', adminController.logout);

// Dashboard
router.get('/', adminAuth, adminController.loadDashboard);
router.get('/dashboard', adminAuth, adminController.loadDashboard);

// Customer Management
router.get('/customers', adminAuth, customerController.customerInfo);
router.post('/customers/block/:id', adminAuth, customerController.blockUser);
router.post('/customers/unblock/:id', adminAuth, customerController.unblockUser);

// Fallback Error Page
router.get('/pageerror', adminController.pageerror);

module.exports = router;
