const Category = require('../../models/categorySchema');

const isDev = process.env.NODE_ENV !== 'production';

// Get all categories with filtering, searching, and pagination
const getAllCategories = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 100;
        const search = req.query.search || '';
        const status = req.query.status || 'all';
        const offerStatus = req.query.offerStatus || 'all';
        const sortBy = req.query.sortBy || 'createdAt';
        const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

        // Build search query for ALL categories (removed isDeleted filter)
        let searchQuery = {};
        
        if (search) {
            searchQuery.$or = [
                { categoryname: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        // Filter by listed status
        if (status === 'listed') {
            searchQuery.islisted = true;
        } else if (status === 'unlisted') {
            searchQuery.islisted = false;
        }

        // Filter by offer status
        if (offerStatus === 'with-offers') {
            searchQuery.categoryoffer = { $gt: 0 };
        } else if (offerStatus === 'no-offers') {
            searchQuery.categoryoffer = { $lte: 0 };
        }

        const skip = (page - 1) * limit;

        // Default sort by createdAt desc (latest first)
        let sortOptions = {};
        if (sortBy === 'createdAt') {
            sortOptions = { createdAt: -1 };
        } else {
            sortOptions = { [sortBy]: sortOrder };
        }

        // Get categories with pagination
        const categories = await Category.find(searchQuery)
            .sort(sortOptions)
            .skip(skip)
            .limit(limit)
            .lean();

        // Get total count for pagination
        const totalCategories = await Category.countDocuments(searchQuery);
        const totalPages = Math.ceil(totalCategories / limit);

        // Get category statistics (simplified)
        const stats = {
            total: await Category.countDocuments({}),
            listed: await Category.countDocuments({ islisted: true }),
            unlisted: await Category.countDocuments({ islisted: false }),
            withOffers: await Category.countDocuments({ categoryoffer: { $gt: 0 } })
        };

        console.log(`=== CATEGORY CONTROLLER ===`);
        console.log(`Total categories found: ${categories.length}`);
        console.log(`Stats:`, stats);

        res.status(200).json({
            success: true,
            data: {
                categories,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalCategories,
                    hasNext: page < totalPages,
                    hasPrev: page > 1,
                    limit
                },
                stats,
                filters: {
                    search,
                    status,
                    offerStatus,
                    sortBy,
                    sortOrder: req.query.sortOrder || 'desc'
                }
            }
        });

    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching categories'
        });
    }
};

// Get category statistics
const getCategoryStats = async (req, res) => {
    try {
        const stats = {
            total: await Category.countDocuments({}),
            listed: await Category.countDocuments({ islisted: true }),
            unlisted: await Category.countDocuments({ islisted: false }),
            withOffers: await Category.countDocuments({ categoryoffer: { $gt: 0 } })
        };

        res.status(200).json({
            success: true,
            data: stats
        });

    } catch (error) {
        console.error('Get category stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching category statistics'
        });
    }
};

// Create new category
const createCategory = async (req, res) => {
    try {
        const { categoryname, description } = req.body;

        // Validation
        if (!categoryname || !description) {
            return res.status(400).json({
                success: false,
                message: 'Category name and description are required'
            });
        }

        // Trim and validate inputs
        const trimmedName = categoryname.trim();
        const trimmedDescription = description.trim();

        if (trimmedName.length < 2 || trimmedName.length > 50) {
            return res.status(400).json({
                success: false,
                message: 'Category name must be between 2 and 50 characters'
            });
        }

        if (trimmedDescription.length < 10 || trimmedDescription.length > 500) {
            return res.status(400).json({
                success: false,
                message: 'Description must be between 10 and 500 characters'
            });
        }

        // Check if category with same name exists (case-insensitive)
        const existingCategory = await Category.findOne({
            categoryname: { $regex: new RegExp(`^${trimmedName}$`, 'i') }
        });

        if (existingCategory) {
            return res.status(400).json({
                success: false,
                message: 'Category with this name already exists'
            });
        }

        // Create new category
        const newCategory = new Category({
            categoryname: trimmedName,
            description: trimmedDescription,
            islisted: true,
            categoryoffer: 0,
            discountType: 'percentage'
        });

        const savedCategory = await newCategory.save();

        if (isDev) console.log('Category created:', savedCategory.categoryname);

        res.status(201).json({
            success: true,
            message: 'Category created successfully',
            data: savedCategory
        });

    } catch (error) {
        console.error('Create category error:', error);
        
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Category with this name already exists'
            });
        }

        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({
                success: false,
                message: messages.join(', ')
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error creating category'
        });
    }
};

// Get category by ID
const getCategoryById = async (req, res) => {
    try {
        const categoryId = req.params.id;

        if (!categoryId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid category ID format'
            });
        }

        const category = await Category.findById(categoryId).lean();

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        res.status(200).json({
            success: true,
            data: category
        });

    } catch (error) {
        console.error('Get category by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching category'
        });
    }
};

// Update category
const updateCategory = async (req, res) => {
    try {
        const categoryId = req.params.id;
        const { categoryname, description } = req.body;

        if (!categoryId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid category ID format'
            });
        }

        // Validation
        if (!categoryname || !description) {
            return res.status(400).json({
                success: false,
                message: 'Category name and description are required'
            });
        }

        // Trim and validate inputs
        const trimmedName = categoryname.trim();
        const trimmedDescription = description.trim();

        if (trimmedName.length < 2 || trimmedName.length > 50) {
            return res.status(400).json({
                success: false,
                message: 'Category name must be between 2 and 50 characters'
            });
        }

        if (trimmedDescription.length < 10 || trimmedDescription.length > 500) {
            return res.status(400).json({
                success: false,
                message: 'Description must be between 10 and 500 characters'
            });
        }

        // Check if category exists
        const existingCategory = await Category.findById(categoryId);

        if (!existingCategory) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        // Check if another category with same name exists (excluding current)
        const duplicateCategory = await Category.findOne({
            _id: { $ne: categoryId },
            categoryname: { $regex: new RegExp(`^${trimmedName}$`, 'i') }
        });

        if (duplicateCategory) {
            return res.status(400).json({
                success: false,
                message: 'Another category with this name already exists'
            });
        }

        // Update category
        const updatedCategory = await Category.findByIdAndUpdate(
            categoryId,
            {
                categoryname: trimmedName,
                description: trimmedDescription,
                updatedAt: new Date()
            },
            { new: true, runValidators: true }
        );

        if (isDev) console.log('Category updated:', updatedCategory.categoryname);

        res.status(200).json({
            success: true,
            message: 'Category updated successfully',
            data: updatedCategory
        });

    } catch (error) {
        console.error('Update category error:', error);
        
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Another category with this name already exists'
            });
        }

        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({
                success: false,
                message: messages.join(', ')
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error updating category'
        });
    }
};

// Toggle category status (list/unlist)
const toggleCategoryStatus = async (req, res) => {
    try {
        const categoryId = req.params.id;

        if (!categoryId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid category ID format'
            });
        }

        const category = await Category.findById(categoryId);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        // Toggle the listing status
        const newStatus = !category.islisted;
        const updatedCategory = await Category.findByIdAndUpdate(
            categoryId,
            { 
                islisted: newStatus,
                updatedAt: new Date()
            },
            { new: true }
        );

        const action = newStatus ? 'listed' : 'unlisted';
        if (isDev) console.log(`Category ${action}:`, updatedCategory.categoryname);

        res.status(200).json({
            success: true,
            message: `Category ${action} successfully`,
            data: updatedCategory
        });

    } catch (error) {
        console.error('Toggle category status error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating category status'
        });
    }
};

// HARD DELETE - Permanently remove from database (renamed from hardDeleteCategory)
const deleteCategory = async (req, res) => {
    try {
        const categoryId = req.params.id;

        if (!categoryId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid category ID format'
            });
        }

        // Check if category exists
        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        // TODO: Add check for products when product management is implemented
        // const productCount = await Product.countDocuments({ categoryId: categoryId });
        // if (productCount > 0) {
        //     return res.status(400).json({
        //         success: false,
        //         message: 'Cannot delete category with existing products'
        //     });
        // }

        // PERMANENTLY DELETE from database
        await Category.findByIdAndDelete(categoryId);

        if (isDev) console.log('Category permanently deleted:', category.categoryname);

        res.status(200).json({
            success: true,
            message: 'Category deleted successfully',
            data: { deletedCategory: category.categoryname }
        });

    } catch (error) {
        console.error('Delete category error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting category'
        });
    }
};

// Add offer to category
const addOffer = async (req, res) => {
    try {
        const categoryId = req.params.id;
        const { discountType, categoryoffer } = req.body;

        if (!categoryId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid category ID format'
            });
        }

        // Validation
        if (!discountType || categoryoffer === undefined || categoryoffer === null) {
            return res.status(400).json({
                success: false,
                message: 'Discount type and offer value are required'
            });
        }

        if (!['percentage', 'fixed'].includes(discountType)) {
            return res.status(400).json({
                success: false,
                message: 'Discount type must be either "percentage" or "fixed"'
            });
        }

        const offerValue = parseFloat(categoryoffer);
        if (isNaN(offerValue) || offerValue <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Offer value must be a positive number'
            });
        }

        if (discountType === 'percentage' && offerValue > 100) {
            return res.status(400).json({
                success: false,
                message: 'Percentage discount cannot be more than 100%'
            });
        }

        if (discountType === 'fixed' && offerValue > 10000) {
            return res.status(400).json({
                success: false,
                message: 'Fixed discount cannot be more than ₹10,000'
            });
        }

        const category = await Category.findById(categoryId);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        if (category.categoryoffer > 0) {
            return res.status(400).json({
                success: false,
                message: 'Category already has an offer. Use edit offer instead.'
            });
        }

        // Add the offer
        const updatedCategory = await Category.findByIdAndUpdate(
            categoryId,
            {
                discountType: discountType,
                categoryoffer: offerValue,
                updatedAt: new Date()
            },
            { new: true, runValidators: true }
        );

        if (isDev) console.log(`Offer added to category:`, updatedCategory.categoryname);

        res.status(200).json({
            success: true,
            message: 'Offer added successfully',
            data: updatedCategory
        });

    } catch (error) {
        console.error('Add offer error:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding offer to category'
        });
    }
};

// Edit existing offer
const editOffer = async (req, res) => {
    try {
        const categoryId = req.params.id;
        const { discountType, categoryoffer } = req.body;

        if (!categoryId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid category ID format'
            });
        }

        // Validation
        if (!discountType || categoryoffer === undefined || categoryoffer === null) {
            return res.status(400).json({
                success: false,
                message: 'Discount type and offer value are required'
            });
        }

        if (!['percentage', 'fixed'].includes(discountType)) {
            return res.status(400).json({
                success: false,
                message: 'Discount type must be either "percentage" or "fixed"'
            });
        }

        const offerValue = parseFloat(categoryoffer);
        if (isNaN(offerValue) || offerValue <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Offer value must be a positive number'
            });
        }

        if (discountType === 'percentage' && offerValue > 100) {
            return res.status(400).json({
                success: false,
                message: 'Percentage discount cannot be more than 100%'
            });
        }

        if (discountType === 'fixed' && offerValue > 10000) {
            return res.status(400).json({
                success: false,
                message: 'Fixed discount cannot be more than ₹10,000'
            });
        }

        const category = await Category.findById(categoryId);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        if (category.categoryoffer <= 0) {
            return res.status(400).json({
                success: false,
                message: 'No existing offer found to edit'
            });
        }

        // Update the offer
        const updatedCategory = await Category.findByIdAndUpdate(
            categoryId,
            {
                discountType: discountType,
                categoryoffer: offerValue,
                updatedAt: new Date()
            },
            { new: true, runValidators: true }
        );

        if (isDev) console.log(`Offer updated for category:`, updatedCategory.categoryname);

        res.status(200).json({
            success: true,
            message: 'Offer updated successfully',
            data: updatedCategory
        });

    } catch (error) {
        console.error('Edit offer error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating offer'
        });
    }
};

// Remove offer from category
const removeOffer = async (req, res) => {
    try {
        const categoryId = req.params.id;

        if (!categoryId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid category ID format'
            });
        }

        const category = await Category.findById(categoryId);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        if (category.categoryoffer <= 0) {
            return res.status(400).json({
                success: false,
                message: 'No offer found to remove'
            });
        }

        // Remove the offer
        const updatedCategory = await Category.findByIdAndUpdate(
            categoryId,
            {
                categoryoffer: 0,
                discountType: 'percentage', // Reset to default
                updatedAt: new Date()
            },
            { new: true }
        );

        if (isDev) console.log(`Offer removed from category:`, updatedCategory.categoryname);

        res.status(200).json({
            success: true,
            message: 'Offer removed successfully',
            data: updatedCategory
        });

    } catch (error) {
        console.error('Remove offer error:', error);
        res.status(500).json({
            success: false,
            message: 'Error removing offer'
        });
    }
};

module.exports = {
    getAllCategories,
    getCategoryStats,
    createCategory,
    getCategoryById,
    updateCategory,
    toggleCategoryStatus,
    deleteCategory, // RENAMED FROM hardDeleteCategory TO deleteCategory
    addOffer,
    editOffer,
    removeOffer
};
