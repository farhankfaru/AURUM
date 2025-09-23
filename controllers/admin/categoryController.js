
const Category = require('../../models/categorySchema');


const loadCategories = async (req, res) => {
    try {
        const search = req.query.search || "";
        const page = parseInt(req.query.page) || 1;
        const limit = 4;
        const skip = (page - 1) * limit;

        const searchRegex = new RegExp(".*" + search.trim() + ".*", "i");
        const query = { 
            categoryname: { $regex: searchRegex },
            isDeleted: false
        };

        const categories = await Category.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .exec();

        const count = await Category.countDocuments(query);
        const totalPages = Math.ceil(count / limit);
        
        res.render('categories', {
            categories: categories,
            totalPages: totalPages,
            currentPage: page,
            search: search,
            success_msg: req.flash('success_msg'),
            error_msg: req.flash('error_msg')
        });

    } catch (error) {
        console.error("Error loading category page:", error.message);
        req.flash('error_msg', 'Error: Failed to load categories.');
        res.redirect("/admin/pageerror");
    }
};


const addCategory = async (req, res) => {
    try {
        const categoryNameInput = req.body.categoryname || '';
        const descriptionInput = req.body.description || '';
        
        const trimmedName = categoryNameInput.trim();
        const trimmedDescription = descriptionInput.trim();

        if (trimmedName === '' || trimmedDescription === '') {
            req.flash('error_msg', 'Error: Name and description cannot be blank.');
            return res.redirect('/admin/categories');
        }

        if (/^\d+$/.test(trimmedName)) {
            req.flash('error_msg', 'Error: Category name cannot consist only of numbers.');
            return res.redirect('/admin/categories');
        }

        const existingCategory = await Category.findOne({ 
            categoryname: trimmedName,
            isDeleted: false 
        });
        
        if (existingCategory) {
            req.flash('error_msg', 'Error: A category with this exact name already exists.');
            return res.redirect('/admin/categories');
        }

        const newCategory = new Category({
            categoryname: trimmedName,
            description: trimmedDescription,
            islisted: true,
            categoryoffer: 0,
            discountType: 'percentage',
            isDeleted: false
        });

        await newCategory.save();
        req.flash('success_msg', 'Success: New category has been added successfully!');
        res.redirect('/admin/categories');

    } catch (error) {
        console.error("Error adding category:", error.message);
        req.flash('error_msg', 'Error: Failed to add category. Please try again.');
        res.redirect('/admin/categories');
    }
};


const getCategory = async (req, res) => {
    try {
        const categoryId = req.params.id;
        const category = await Category.findOne({ 
            _id: categoryId, 
            isDeleted: false 
        });
        
        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        res.json({
            success: true,
            category: {
                _id: category._id,
                categoryname: category.categoryname,
                description: category.description,
                islisted: category.islisted,
                categoryoffer: category.categoryoffer,
                discountType: category.discountType || 'percentage'
            }
        });

    } catch (error) {
        console.error("Error getting category:", error.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};


const editCategory = async (req, res) => {
    try {
        const categoryId = req.params.id;
        const { categoryname, description } = req.body;
        
        const trimmedName = categoryname.trim();
        const trimmedDescription = description.trim();

        if (trimmedName === '' || trimmedDescription === '') {
            req.flash('error_msg', 'Error: Name and description cannot be blank.');
            return res.redirect('/admin/categories');
        }

        if (/^\d+$/.test(trimmedName)) {
            req.flash('error_msg', 'Error: Category name cannot consist only of numbers.');
            return res.redirect('/admin/categories');
        }

        const category = await Category.findOne({ 
            _id: categoryId, 
            isDeleted: false 
        });
        
        if (!category) {
            req.flash('error_msg', 'Error: Category not found.');
            return res.redirect('/admin/categories');
        }

        const existingCategory = await Category.findOne({ 
            categoryname: trimmedName,
            _id: { $ne: categoryId },
            isDeleted: false
        });
        
        if (existingCategory) {
            req.flash('error_msg', 'Error: Another category with this name already exists.');
            return res.redirect('/admin/categories');
        }

        await Category.findByIdAndUpdate(categoryId, {
            categoryname: trimmedName,
            description: trimmedDescription
        });

        req.flash('success_msg', 'Success: Category has been updated successfully!');
        res.redirect('/admin/categories');

    } catch (error) {
        console.error("Error editing category:", error.message);
        req.flash('error_msg', 'Error: Failed to update category. Please try again.');
        res.redirect('/admin/categories');
    }
};


const toggleCategoryStatus = async (req, res) => {
    try {
        const categoryId = req.params.id;
        
        const category = await Category.findOne({ 
            _id: categoryId, 
            isDeleted: false 
        });
        
        if (!category) {
            req.flash('error_msg', 'Error: Category not found.');
            return res.redirect('/admin/categories');
        }

        const newStatus = !category.islisted;
        await Category.findByIdAndUpdate(categoryId, { islisted: newStatus });

        const statusText = newStatus ? 'listed' : 'unlisted';
        req.flash('success_msg', `Success: Category has been ${statusText} successfully!`);
        res.redirect('/admin/categories');

    } catch (error) {
        console.error("Error toggling category status:", error.message);
        req.flash('error_msg', 'Error: Failed to update category status. Please try again.');
        res.redirect('/admin/categories');
    }
};

const deleteCategory = async (req, res) => {
    try {
        const categoryId = req.params.id;
        
        const category = await Category.findOne({ 
            _id: categoryId, 
            isDeleted: false 
        });
        
        if (!category) {
            req.flash('error_msg', 'Error: Category not found.');
            return res.redirect('/admin/categories');
        }

        await Category.findByIdAndUpdate(categoryId, { 
            isDeleted: true,
            islisted: false
        });

        req.flash('success_msg', 'Success: Category has been deleted successfully!');
        res.redirect('/admin/categories');

    } catch (error) {
        console.error("Error deleting category:", error.message);
        req.flash('error_msg', 'Error: Failed to delete category. Please try again.');
        res.redirect('/admin/categories');
    }
};


const addOffer = async (req, res) => {
    try {
        const categoryId = req.params.id;
        const discountValue = parseFloat(req.body.discountValue);
        const discountType = req.body.discountType;

       
        if (!discountValue || discountValue <= 0) {
            req.flash('error_msg', 'Error: Discount value must be greater than 0.');
            return res.redirect('/admin/categories');
        }

        if (discountType === 'percentage' && (discountValue < 1 || discountValue > 90)) {
            req.flash('error_msg', 'Error: Percentage discount must be between 1% and 90%.');
            return res.redirect('/admin/categories');
        }

        if (discountType === 'fixed' && discountValue > 50000) {
            req.flash('error_msg', 'Error: Fixed discount cannot exceed ₹50,000.');
            return res.redirect('/admin/categories');
        }

        const category = await Category.findOne({ 
            _id: categoryId, 
            isDeleted: false 
        });
        
        if (!category) {
            req.flash('error_msg', 'Error: Category not found.');
            return res.redirect('/admin/categories');
        }

        await Category.findByIdAndUpdate(categoryId, { 
            categoryoffer: discountValue,
            discountType: discountType
        });

        const discountText = discountType === 'percentage' ? `${discountValue}%` : `₹${discountValue}`;
        req.flash('success_msg', `Success: ${discountText} discount has been added to the category!`);
        res.redirect('/admin/categories');

    } catch (error) {
        console.error("Error adding discount:", error.message);
        req.flash('error_msg', 'Error: Failed to add discount. Please try again.');
        res.redirect('/admin/categories');
    }
};


const editOffer = async (req, res) => {
    try {
        const categoryId = req.params.id;
        const discountValue = parseFloat(req.body.discountValue);
        const discountType = req.body.discountType;

        
        if (!discountValue || discountValue <= 0) {
            req.flash('error_msg', 'Error: Discount value must be greater than 0.');
            return res.redirect('/admin/categories');
        }

        if (discountType === 'percentage' && (discountValue < 1 || discountValue > 90)) {
            req.flash('error_msg', 'Error: Percentage discount must be between 1% and 90%.');
            return res.redirect('/admin/categories');
        }

        if (discountType === 'fixed' && discountValue > 50000) {
            req.flash('error_msg', 'Error: Fixed discount cannot exceed ₹50,000.');
            return res.redirect('/admin/categories');
        }

        const category = await Category.findOne({ 
            _id: categoryId, 
            isDeleted: false 
        });
        
        if (!category) {
            req.flash('error_msg', 'Error: Category not found.');
            return res.redirect('/admin/categories');
        }

        await Category.findByIdAndUpdate(categoryId, { 
            categoryoffer: discountValue,
            discountType: discountType
        });

        const discountText = discountType === 'percentage' ? `${discountValue}%` : `₹${discountValue}`;
        req.flash('success_msg', `Success: Discount has been updated to ${discountText}!`);
        res.redirect('/admin/categories');

    } catch (error) {
        console.error("Error editing discount:", error.message);
        req.flash('error_msg', 'Error: Failed to update discount. Please try again.');
        res.redirect('/admin/categories');
    }
};


const removeOffer = async (req, res) => {
    try {
        const categoryId = req.params.id;
        
        const category = await Category.findOne({ 
            _id: categoryId, 
            isDeleted: false 
        });
        
        if (!category) {
            req.flash('error_msg', 'Error: Category not found.');
            return res.redirect('/admin/categories');
        }

        await Category.findByIdAndUpdate(categoryId, { 
            categoryoffer: 0,
            discountType: 'percentage'
        });

        req.flash('success_msg', 'Success: Discount has been removed from the category!');
        res.redirect('/admin/categories');

    } catch (error) {
        console.error("Error removing discount:", error.message);
        req.flash('error_msg', 'Error: Failed to remove discount. Please try again.');
        res.redirect('/admin/categories');
    }
};


const getActiveCategories = async () => {
    try {
        return await Category.find({ 
            islisted: true, 
            isDeleted: false 
        }).sort({ createdAt: -1 });
    } catch (error) {
        console.error("Error getting active categories:", error.message);
        return [];
    }
};

const clearSearch = async (req, res) => {
    try {
        res.redirect('/admin/categories');
    } catch (error) {
        console.error("Error clearing search:", error.message);
        res.redirect('/admin/categories');
    }
};

module.exports = {
    loadCategories,
    addCategory,
    getCategory,
    editCategory,
    toggleCategoryStatus,
    deleteCategory,
    addOffer,
    editOffer,
    removeOffer,
    getActiveCategories,
    clearSearch
};
