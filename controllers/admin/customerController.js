const User = require('../../models/userSchema');

const isDev = process.env.NODE_ENV !== 'production';

// Get all customers with filtering, searching, and pagination
const getAllCustomers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 100; // Default to 100 to get all customers
        const search = req.query.search || '';
        const status = req.query.status || 'all';
        const sortBy = req.query.sortBy || 'createdAt';
        const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

        // Build search query for non-admin users only
        let searchQuery = { isAdmin: false };
        
        if (search) {
            searchQuery.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } }
            ];
        }

        // Filter by blocked status
        if (status === 'active') {
            searchQuery.isBlocked = false;
        } else if (status === 'blocked') {
            searchQuery.isBlocked = true;
        }

        const skip = (page - 1) * limit;

        // Default sort by createdAt desc (latest first)
        let sortOptions = {};
        if (sortBy === 'createdAt') {
            sortOptions = { createdAt: -1 };
        } else {
            sortOptions = { [sortBy]: sortOrder };
        }

        // Get customers with pagination
        const customers = await User.find(searchQuery)
            .sort(sortOptions)
            .skip(skip)
            .limit(limit)
            .select('-password') // Exclude password field
            .lean();

        // Get total count for pagination
        const totalCustomers = await User.countDocuments(searchQuery);
        const totalPages = Math.ceil(totalCustomers / limit);

        // Get customer statistics
        const stats = {
            total: await User.countDocuments({ isAdmin: false }),
            active: await User.countDocuments({ isAdmin: false, isBlocked: false }),
            blocked: await User.countDocuments({ isAdmin: false, isBlocked: true }),
            googleUsers: await User.countDocuments({ isAdmin: false, googleId: { $exists: true, $ne: null } })
        };

        console.log(`=== CUSTOMER CONTROLLER ===`);
        console.log(`Total customers found: ${customers.length}`);
        console.log(`Stats:`, stats);

        res.status(200).json({
            success: true,
            data: {
                customers,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalCustomers,
                    hasNext: page < totalPages,
                    hasPrev: page > 1,
                    limit
                },
                stats,
                filters: {
                    search,
                    status,
                    sortBy,
                    sortOrder: req.query.sortOrder || 'desc'
                }
            }
        });

    } catch (error) {
        console.error('Get customers error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching customers'
        });
    }
};

// Get customer statistics
const getCustomerStats = async (req, res) => {
    try {
        const stats = {
            total: await User.countDocuments({ isAdmin: false }),
            active: await User.countDocuments({ isAdmin: false, isBlocked: false }),
            blocked: await User.countDocuments({ isAdmin: false, isBlocked: true }),
            googleUsers: await User.countDocuments({ isAdmin: false, googleId: { $exists: true, $ne: null } }),
            newThisMonth: await User.countDocuments({
                isAdmin: false,
                createdAt: {
                    $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                }
            })
        };

        res.status(200).json({
            success: true,
            data: stats
        });

    } catch (error) {
        console.error('Get customer stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching customer statistics'
        });
    }
};

// Get customer by ID
const getCustomerById = async (req, res) => {
    try {
        const customerId = req.params.id;

        if (!customerId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid customer ID format'
            });
        }

        const customer = await User.findOne({ 
            _id: customerId, 
            isAdmin: false 
        }).select('-password').lean();

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        res.status(200).json({
            success: true,
            data: customer
        });

    } catch (error) {
        console.error('Get customer by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching customer'
        });
    }
};

// Block customer
const blockCustomer = async (req, res) => {
    try {
        const customerId = req.params.id;

        if (!customerId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid customer ID format'
            });
        }

        const customer = await User.findOne({ 
            _id: customerId, 
            isAdmin: false 
        });

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        if (customer.isBlocked) {
            return res.status(400).json({
                success: false,
                message: 'Customer is already blocked'
            });
        }

        // Block the customer
        const updatedCustomer = await User.findByIdAndUpdate(
            customerId,
            { 
                isBlocked: true,
                blockedAt: new Date(),
                updatedAt: new Date()
            },
            { new: true }
        ).select('-password');

        if (isDev) console.log('Customer blocked:', updatedCustomer.email);

        res.status(200).json({
            success: true,
            message: `${customer.name || 'Customer'} has been blocked successfully`,
            data: updatedCustomer
        });

    } catch (error) {
        console.error('Block customer error:', error);
        res.status(500).json({
            success: false,
            message: 'Error blocking customer'
        });
    }
};

// Unblock customer
const unblockCustomer = async (req, res) => {
    try {
        const customerId = req.params.id;

        if (!customerId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid customer ID format'
            });
        }

        const customer = await User.findOne({ 
            _id: customerId, 
            isAdmin: false 
        });

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        if (!customer.isBlocked) {
            return res.status(400).json({
                success: false,
                message: 'Customer is not blocked'
            });
        }

        // Unblock the customer
        const updatedCustomer = await User.findByIdAndUpdate(
            customerId,
            { 
                isBlocked: false,
                $unset: { blockedAt: "" }, // Remove blockedAt field
                updatedAt: new Date()
            },
            { new: true }
        ).select('-password');

        if (isDev) console.log('Customer unblocked:', updatedCustomer.email);

        res.status(200).json({
            success: true,
            message: `${customer.name || 'Customer'} has been unblocked successfully`,
            data: updatedCustomer
        });

    } catch (error) {
        console.error('Unblock customer error:', error);
        res.status(500).json({
            success: false,
            message: 'Error unblocking customer'
        });
    }
};

// Delete customer (soft delete - for future use)
const deleteCustomer = async (req, res) => {
    try {
        const customerId = req.params.id;

        if (!customerId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid customer ID format'
            });
        }

        const customer = await User.findOne({ 
            _id: customerId, 
            isAdmin: false 
        });

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        // Soft delete the customer (mark as deleted but keep in database)
        const updatedCustomer = await User.findByIdAndUpdate(
            customerId,
            { 
                isDeleted: true,
                isBlocked: true, // Also block when deleting
                deletedAt: new Date(),
                updatedAt: new Date()
            },
            { new: true }
        ).select('-password');

        if (isDev) console.log('Customer soft deleted:', updatedCustomer.email);

        res.status(200).json({
            success: true,
            message: `${customer.name || 'Customer'} has been deleted successfully`,
            data: updatedCustomer
        });

    } catch (error) {
        console.error('Delete customer error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting customer'
        });
    }
};

// Get customer order history (for future use)
const getCustomerOrders = async (req, res) => {
    try {
        const customerId = req.params.id;

        if (!customerId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid customer ID format'
            });
        }

        const customer = await User.findOne({ 
            _id: customerId, 
            isAdmin: false 
        });

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        // For now, return empty orders (will be implemented when order system is ready)
        res.status(200).json({
            success: true,
            data: {
                orders: [],
                totalOrders: 0,
                totalSpent: 0,
                message: 'Order system coming soon'
            }
        });

    } catch (error) {
        console.error('Get customer orders error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching customer orders'
        });
    }
};

// Update customer details (for future use)
const updateCustomer = async (req, res) => {
    try {
        const customerId = req.params.id;
        const { name, phone } = req.body; // Only allow updating name and phone

        if (!customerId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid customer ID format'
            });
        }

        const customer = await User.findOne({ 
            _id: customerId, 
            isAdmin: false 
        });

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        // Prepare update data
        const updateData = {
            updatedAt: new Date()
        };

        if (name && name.trim()) {
            updateData.name = name.trim();
        }

        if (phone && phone.trim()) {
            // Basic phone validation
            const phoneRegex = /^[6-9]\d{9}$/;
            if (!phoneRegex.test(phone.trim())) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid phone number format'
                });
            }
            updateData.phone = phone.trim();
        }

        const updatedCustomer = await User.findByIdAndUpdate(
            customerId,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');

        if (isDev) console.log('Customer updated:', updatedCustomer.email);

        res.status(200).json({
            success: true,
            message: 'Customer updated successfully',
            data: updatedCustomer
        });

    } catch (error) {
        console.error('Update customer error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating customer'
        });
    }
};

// Search customers by query (for future use)
const searchCustomers = async (req, res) => {
    try {
        const { query, limit = 10 } = req.query;

        if (!query || query.trim().length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Search query must be at least 2 characters'
            });
        }

        const searchRegex = { $regex: query.trim(), $options: 'i' };

        const customers = await User.find({
            isAdmin: false,
            isDeleted: { $ne: true },
            $or: [
                { name: searchRegex },
                { email: searchRegex },
                { phone: searchRegex }
            ]
        })
        .select('name email phone isBlocked createdAt')
        .limit(parseInt(limit))
        .lean();

        res.status(200).json({
            success: true,
            data: {
                customers,
                count: customers.length
            }
        });

    } catch (error) {
        console.error('Search customers error:', error);
        res.status(500).json({
            success: false,
            message: 'Error searching customers'
        });
    }
};

module.exports = {
    getAllCustomers,
    getCustomerStats,
    getCustomerById,
    blockCustomer,
    unblockCustomer,
    deleteCustomer,
    getCustomerOrders,
    updateCustomer,
    searchCustomers
};
