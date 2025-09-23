const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin/adminController');
const customerController = require('../controllers/admin/customerControllers');
const categoryController = require('../controllers/admin/categoryController');
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

// Category Management - 
router.get('/categories', adminAuth, categoryController.loadCategories);
router.post('/categories', adminAuth, categoryController.addCategory);
router.get('/categories/get/:id', adminAuth, categoryController.getCategory);
router.post('/categories/edit/:id', adminAuth, categoryController.editCategory);
router.post('/categories/toggle/:id', adminAuth, categoryController.toggleCategoryStatus);
router.post('/categories/delete/:id', adminAuth, categoryController.deleteCategory);
router.post('/categories/add-offer/:id', adminAuth, categoryController.addOffer);
router.post('/categories/edit-offer/:id', adminAuth, categoryController.editOffer);
router.post('/categories/remove-offer/:id', adminAuth, categoryController.removeOffer);
router.get('/categories/clear-search', adminAuth, categoryController.clearSearch);

// Error Page
router.get('/pageerror', adminController.pageerror);

module.exports = router;
