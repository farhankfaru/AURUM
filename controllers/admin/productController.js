const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const { deleteProductImage } = require("../../middlewares/productUpload");
const fs = require('fs').promises;
const path = require('path');

const isDev = process.env.NODE_ENV !== 'production';

const productController = {
    // Check if product name already exists
    checkProductName: async (req, res) => {
        try {
            const { name } = req.query;
            
            if (!name) {
                return res.status(400).json({
                    success: false,
                    message: 'Product name is required'
                });
            }
            
            const existingProduct = await Product.findOne({ 
                productname: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
            });
            
            res.json({
                success: true,
                exists: !!existingProduct
            });
            
        } catch (error) {
            console.error('Error checking product name:', error);
            res.status(500).json({
                success: false,
                message: 'Error checking product name'
            });
        }
    },

    // Get all products with stats
    getAllProducts: async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 100;
            const search = req.query.search || '';
            const category = req.query.category || '';
            const status = req.query.status || '';

            // Build query
            let query = {};
            
            if (search) {
                query.$or = [
                    { productname: { $regex: search, $options: 'i' } },
                    { description: { $regex: search, $options: 'i' } }
                ];
            }
            
            if (category && category !== 'all') {
                query.category = category;
            }
            
            if (status && status !== 'all') {
                if (status === 'active') {
                    query.status = 'available';
                    query.isblock = false;
                } else if (status === 'inactive') {
                    query.$or = [
                        { status: 'out_of_stock' },
                        { isblock: true }
                    ];
                } else if (status === 'blocked') {
                    query.isblock = true;
                }
            }

            const skip = (page - 1) * limit;

            // Fixed: populate with categoryname instead of name
            const products = await Product.find(query)
                .populate('category', 'categoryname islisted') // Fixed field names
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit);

            const total = await Product.countDocuments(query);
            const totalPages = Math.ceil(total / limit);

            res.json({
                success: true,
                data: {  // Wrapped in data object for frontend compatibility
                    products,
                    pagination: {
                        page,
                        limit,
                        total,
                        totalPages,
                        hasNext: page < totalPages,
                        hasPrev: page > 1
                    }
                }
            });
        } catch (error) {
            if (isDev) console.error('Error fetching products:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch products'
            });
        }
    },

    // Get product statistics
    getProductStats: async (req, res) => {
        try {
            const totalProducts = await Product.countDocuments();
            const activeProducts = await Product.countDocuments({ 
                status: 'available', 
                isblock: false 
            });
            const blockedProducts = await Product.countDocuments({ isblock: true });
            const outOfStock = await Product.countDocuments({ status: 'out_of_stock' });
            
            // Calculate low stock (products with total quantity <= 5)
            const lowStockProducts = await Product.aggregate([
                {
                    $addFields: {
                        totalStock: { $sum: "$variants.quantity" }
                    }
                },
                {
                    $match: {
                        totalStock: { $lte: 5 },
                        status: 'available',
                        isblock: false
                    }
                },
                {
                    $count: "lowStock"
                }
            ]);

            const lowStock = lowStockProducts.length > 0 ? lowStockProducts[0].lowStock : 0;

            res.json({
                success: true,
                data: {  // Wrapped in data object for frontend compatibility
                    total: totalProducts,
                    active: activeProducts,
                    blocked: blockedProducts,
                    outOfStock: outOfStock,
                    lowStock: lowStock
                }
            });
        } catch (error) {
            if (isDev) console.error('Error fetching product stats:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch product statistics'
            });
        }
    },

    // Get single product
    getProductById: async (req, res) => {
        try {
            const product = await Product.findById(req.params.id)
                .populate('category', 'categoryname description islisted'); // Fixed field names
            
            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }

            res.json({
                success: true,
                data: { product } // Wrapped in data object
            });
        } catch (error) {
            if (isDev) console.error('Error fetching product:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch product'
            });
        }
    },

    // Create new product
    createProduct: async (req, res) => {
        try {
            const {
                productname,
                description,
                category,
                regularprice,
                saleprice,
                variants,
                status = 'available'
            } = req.body;

            // Check for duplicate product name (case-insensitive)
            const existingProduct = await Product.findOne({ 
                productname: { $regex: new RegExp(`^${productname.trim()}$`, 'i') }
            });
            
            if (existingProduct) {
                // Clean up uploaded files if validation fails
                if (req.files && req.files.length > 0) {
                    for (const file of req.files) {
                        try {
                            await deleteProductImage(`/uploads/products/${file.filename}`);
                        } catch (unlinkError) {
                            if (isDev) console.error('Error deleting file:', unlinkError);
                        }
                    }
                }
                
                return res.status(400).json({
                    success: false,
                    message: 'Product name already exists. Please choose a different name.'
                });
            }

            // Handle uploaded images
            let images = [];
            if (req.files && req.files.length > 0) {
                images = req.files.map(file => `/uploads/products/${file.filename}`);
            }

            // Parse variants if it's a string
            let parsedVariants = [];
            if (variants) {
                parsedVariants = typeof variants === 'string' ? JSON.parse(variants) : variants;
            }

            // Validate required fields
            if (!productname || !description || !category || !regularprice) {
                // Clean up uploaded files if validation fails
                if (req.files && req.files.length > 0) {
                    for (const file of req.files) {
                        try {
                            await deleteProductImage(`/uploads/products/${file.filename}`);
                        } catch (unlinkError) {
                            if (isDev) console.error('Error deleting file:', unlinkError);
                        }
                    }
                }
                
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields'
                });
            }

            const product = new Product({
                productname: productname.trim(),
                description: description.trim(),
                category,
                regularprice: parseFloat(regularprice),
                saleprice: saleprice ? parseFloat(saleprice) : 0,
                image: images,
                variants: parsedVariants,
                status,
                isblock: false,
                productoffer: 0,
                appliedoffer: 0
            });

            await product.save();

            // Populate category for consistent response
            await product.populate('category', 'categoryname islisted');

            res.json({
                success: true,
                message: 'Product created successfully',
                data: { product }
            });
        } catch (error) {
            if (isDev) console.error('Error creating product:', error);
            
            // Handle mongoose duplicate key error
            if (error.code === 11000) {
                return res.status(400).json({
                    success: false,
                    message: 'Product name already exists. Please choose a different name.'
                });
            }
            
            // Clean up uploaded files if product creation fails
            if (req.files && req.files.length > 0) {
                for (const file of req.files) {
                    try {
                        await deleteProductImage(`/uploads/products/${file.filename}`);
                    } catch (unlinkError) {
                        if (isDev) console.error('Error deleting file:', unlinkError);
                    }
                }
            }

            res.status(500).json({
                success: false,
                message: error.message || 'Failed to create product'
            });
        }
    },

    // Update product
    updateProduct: async (req, res) => {
        try {
            const productId = req.params.id;
            const existingProduct = await Product.findById(productId);

            if (!existingProduct) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }

            const {
                productname,
                description,
                category,
                regularprice,
                saleprice,
                variants,
                status,
                removeImages
            } = req.body;

            // Check for duplicate product name if name is being changed
            if (productname && productname.trim() !== existingProduct.productname) {
                const duplicateProduct = await Product.findOne({ 
                    productname: { $regex: new RegExp(`^${productname.trim()}$`, 'i') },
                    _id: { $ne: productId }
                });
                
                if (duplicateProduct) {
                    // Clean up uploaded files
                    if (req.files && req.files.length > 0) {
                        for (const file of req.files) {
                            try {
                                await deleteProductImage(`/uploads/products/${file.filename}`);
                            } catch (unlinkError) {
                                if (isDev) console.error('Error deleting file:', unlinkError);
                            }
                        }
                    }
                    
                    return res.status(400).json({
                        success: false,
                        message: 'Product name already exists. Please choose a different name.'
                    });
                }
            }

            // Handle image removal
            let currentImages = [...existingProduct.image];
            if (removeImages) {
                const imagesToRemove = typeof removeImages === 'string' ? JSON.parse(removeImages) : removeImages;
                
                for (const imageUrl of imagesToRemove) {
                    await deleteProductImage(imageUrl);
                    currentImages = currentImages.filter(img => img !== imageUrl);
                }
            }

            // Handle new uploaded images
            if (req.files && req.files.length > 0) {
                const newImages = req.files.map(file => `/uploads/products/${file.filename}`);
                currentImages = [...currentImages, ...newImages];
            }

            // Parse variants
            let parsedVariants = variants;
            if (typeof variants === 'string') {
                parsedVariants = JSON.parse(variants);
            }

            // Update product
            const updatedProduct = await Product.findByIdAndUpdate(
                productId,
                {
                    productname: productname?.trim() || existingProduct.productname,
                    description: description?.trim() || existingProduct.description,
                    category: category || existingProduct.category,
                    regularprice: regularprice ? parseFloat(regularprice) : existingProduct.regularprice,
                    saleprice: saleprice !== undefined ? parseFloat(saleprice) : existingProduct.saleprice,
                    image: currentImages,
                    variants: parsedVariants || existingProduct.variants,
                    status: status || existingProduct.status
                },
                { new: true, runValidators: true }
            ).populate('category', 'categoryname islisted'); // Fixed field names

            res.json({
                success: true,
                message: 'Product updated successfully',
                data: { product: updatedProduct }
            });
        } catch (error) {
            if (isDev) console.error('Error updating product:', error);
            
            // Handle mongoose duplicate key error
            if (error.code === 11000) {
                return res.status(400).json({
                    success: false,
                    message: 'Product name already exists. Please choose a different name.'
                });
            }
            
            // Clean up uploaded files if update fails
            if (req.files && req.files.length > 0) {
                for (const file of req.files) {
                    try {
                        await deleteProductImage(`/uploads/products/${file.filename}`);
                    } catch (unlinkError) {
                        if (isDev) console.error('Error deleting file:', unlinkError);
                    }
                }
            }

            res.status(500).json({
                success: false,
                message: error.message || 'Failed to update product'
            });
        }
    },

    // Toggle product status (block/unblock)
    toggleProductStatus: async (req, res) => {
        try {
            const product = await Product.findById(req.params.id);

            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }

            const newBlockStatus = !product.isblock;
            
            await Product.findByIdAndUpdate(req.params.id, { 
                isblock: newBlockStatus
            });

            res.json({
                success: true,
                message: `Product ${newBlockStatus ? 'unlisted' : 'listed'} successfully`,
                data: { isblock: newBlockStatus }
            });
        } catch (error) {
            if (isDev) console.error('Error toggling product status:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to toggle product status'
            });
        }
    },

    // Delete product
    deleteProduct: async (req, res) => {
        try {
            const product = await Product.findById(req.params.id);

            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }

            // Delete associated images
            for (const imageUrl of product.image) {
                await deleteProductImage(imageUrl);
            }

            await Product.findByIdAndDelete(req.params.id);

            res.json({
                success: true,
                message: 'Product deleted successfully'
            });
        } catch (error) {
            if (isDev) console.error('Error deleting product:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete product'
            });
        }
    },

    // Add offer to product
    addOffer: async (req, res) => {
        try {
            const { offerType, offerValue } = req.body;
            const productId = req.params.id;

            if (!offerType || !offerValue || offerValue < 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid offer type and value are required'
                });
            }

            const product = await Product.findById(productId);
            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }

            let offerAmount;
            let newSalePrice;

            if (offerType === 'percentage') {
                if (offerValue > 90) {
                    return res.status(400).json({
                        success: false,
                        message: 'Percentage offer cannot exceed 90%'
                    });
                }
                // Calculate percentage offer
                offerAmount = Math.round((product.regularprice * offerValue) / 100);
                newSalePrice = product.regularprice - offerAmount;
            } else if (offerType === 'fixed') {
                if (offerValue >= product.regularprice) {
                    return res.status(400).json({
                        success: false,
                        message: 'Fixed offer amount cannot be greater than or equal to regular price'
                    });
                }
                // Fixed amount offer
                offerAmount = offerValue;
                newSalePrice = product.regularprice - offerAmount;
            } else {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid offer type. Use "percentage" or "fixed"'
                });
            }

            await Product.findByIdAndUpdate(productId, {
                productoffer: offerValue,
                appliedoffer: offerAmount,
                saleprice: newSalePrice,
                offerType: offerType // Store offer type for editing
            });

            res.json({
                success: true,
                message: 'Offer added successfully',
                data: {
                    offer: {
                        type: offerType,
                        value: offerValue,
                        amount: offerAmount,
                        newSalePrice: newSalePrice
                    }
                }
            });
        } catch (error) {
            if (isDev) console.error('Error adding offer:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to add offer'
            });
        }
    },

    // Edit offer
    editOffer: async (req, res) => {
        try {
            const { offerType, offerValue } = req.body;
            const productId = req.params.id;

            if (!offerType || !offerValue || offerValue < 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid offer type and value are required'
                });
            }

            const product = await Product.findById(productId);
            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }

            let offerAmount;
            let newSalePrice;

            if (offerType === 'percentage') {
                if (offerValue > 90) {
                    return res.status(400).json({
                        success: false,
                        message: 'Percentage offer cannot exceed 90%'
                    });
                }
                offerAmount = Math.round((product.regularprice * offerValue) / 100);
                newSalePrice = product.regularprice - offerAmount;
            } else if (offerType === 'fixed') {
                if (offerValue >= product.regularprice) {
                    return res.status(400).json({
                        success: false,
                        message: 'Fixed offer amount cannot be greater than or equal to regular price'
                    });
                }
                offerAmount = offerValue;
                newSalePrice = product.regularprice - offerAmount;
            } else {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid offer type. Use "percentage" or "fixed"'
                });
            }

            await Product.findByIdAndUpdate(productId, {
                productoffer: offerValue,
                appliedoffer: offerAmount,
                saleprice: newSalePrice,
                offerType: offerType
            });

            res.json({
                success: true,
                message: 'Offer updated successfully',
                data: {
                    offer: {
                        type: offerType,
                        value: offerValue,
                        amount: offerAmount,
                        newSalePrice: newSalePrice
                    }
                }
            });
        } catch (error) {
            if (isDev) console.error('Error editing offer:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to edit offer'
            });
        }
    },

    // FIXED: Remove offer with proper logging
    removeOffer: async (req, res) => {
        try {
            const productId = req.params.id;
            console.log('Removing offer for product:', productId); // Debug log

            const product = await Product.findById(productId);
            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }

            const updateResult = await Product.findByIdAndUpdate(productId, {
                productoffer: 0,
                appliedoffer: 0,
                saleprice: 0,
                $unset: { offerType: 1 } // Remove offer type field
            });

            console.log('Offer removal update result:', updateResult); // Debug log

            res.json({
                success: true,
                message: 'Offer removed successfully'
            });
        } catch (error) {
            console.error('Error removing offer:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to remove offer'
            });
        }
    }
};

module.exports = productController;
