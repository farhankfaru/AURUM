const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin/adminController');
const customerController = require('../controllers/admin/customerController');
const categoryController = require('../controllers/admin/categoryController');
const productController = require('../controllers/admin/productController');
const { adminAuth, adminGuestOnly } = require('../middlewares/auth');
const { uploadProductImages, handleUploadError } = require('../middlewares/productUpload');

// Admin Authentication Routes
router.get('/login', adminGuestOnly, adminController.loadLogin);
router.post('/login', adminGuestOnly, adminController.login);
router.post('/logout', adminAuth, adminController.logout);

// Admin Page Routes - Each page loads separately
router.get('/', adminAuth, adminController.loadDashboard);  // Default to dashboard
router.get('/dashboard', adminAuth, adminController.loadDashboard);
router.get('/customers', adminAuth, adminController.loadCustomers);
router.get('/categories', adminAuth, adminController.loadCategories);
router.get('/products', adminAuth, adminController.loadProducts);
router.get('/add-products', adminAuth, adminController.loadAddProducts);
router.get('/edit-products/:id', adminAuth, adminController.loadEditProducts);
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
router.post('/api/categories/:id/delete', adminAuth, categoryController.deleteCategory);

// Category Offer Management API Routes
router.post('/api/categories/:id/add-offer', adminAuth, categoryController.addOffer);
router.put('/api/categories/:id/edit-offer', adminAuth, categoryController.editOffer);
router.delete('/api/categories/:id/remove-offer', adminAuth, categoryController.removeOffer);

// Product Management API Routes - CRITICAL: check-name route MUST come before :id routes
router.get('/api/products/check-name', adminAuth, productController.checkProductName);
router.get('/api/products', adminAuth, productController.getAllProducts);
router.get('/api/products/stats', adminAuth, productController.getProductStats);
router.post('/api/products', adminAuth, uploadProductImages, handleUploadError, productController.createProduct);
router.get('/api/products/:id', adminAuth, productController.getProductById);
router.put('/api/products/:id', adminAuth, uploadProductImages, handleUploadError, productController.updateProduct);
router.post('/api/products/:id/toggle-status', adminAuth, productController.toggleProductStatus);
router.post('/api/products/:id/delete', adminAuth, productController.deleteProduct);

// Product Offer Management API Routes
router.post('/api/products/:id/add-offer', adminAuth, productController.addOffer);
router.put('/api/products/:id/edit-offer', adminAuth, productController.editOffer);
router.delete('/api/products/:id/remove-offer', adminAuth, productController.removeOffer);

module.exports = router;
