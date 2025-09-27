const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin/adminController');
const customerController = require('../controllers/admin/customerController');
const categoryController = require('../controllers/admin/categoryController');
const { adminAuth, adminGuestOnly } = require('../middlewares/auth');

// Admin Authentication Routes
router.get('/login', adminGuestOnly, adminController.loadLogin);
router.post('/login', adminGuestOnly, adminController.login);
router.post('/logout', adminAuth, adminController.logout);

// Admin Page Routes - Each page loads separately
router.get('/', adminAuth, adminController.loadDashboard);  // Default to dashboard
router.get('/dashboard', adminAuth, adminController.loadDashboard);
router.get('/customers', adminAuth, adminController.loadCustomers);
router.get('/categories', adminAuth, adminController.loadCategories);
router.get('/error', adminController.pageerror);

// Customer Management API Routes
router.get('/api/customers', adminAuth, customerController.getAllCustomers);
router.get('/api/customers/stats', adminAuth, customerController.getCustomerStats);
router.get('/api/customers/:id', adminAuth, customerController.getCustomerById);
router.post('/api/customers/:id/block', adminAuth, customerController.blockCustomer);
router.post('/api/customers/:id/unblock', adminAuth, customerController.unblockCustomer);

// Category Management API Routes
router.get('/api/categories', adminAuth, categoryController.getAllCategories);
router.get('/api/categories/stats', adminAuth, categoryController.getCategoryStats);
router.post('/api/categories', adminAuth, categoryController.createCategory);
router.get('/api/categories/:id', adminAuth, categoryController.getCategoryById);
router.put('/api/categories/:id', adminAuth, categoryController.updateCategory);
router.post('/api/categories/:id/toggle-status', adminAuth, categoryController.toggleCategoryStatus);
router.post('/api/categories/:id/delete', adminAuth, categoryController.deleteCategory); // SINGLE DELETE ROUTE

// Category Offer Management API Routes
router.post('/api/categories/:id/add-offer', adminAuth, categoryController.addOffer);
router.put('/api/categories/:id/edit-offer', adminAuth, categoryController.editOffer);
router.delete('/api/categories/:id/remove-offer', adminAuth, categoryController.removeOffer);

module.exports = router;
