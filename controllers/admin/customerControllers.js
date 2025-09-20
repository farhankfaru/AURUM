const User = require('../../models/userSchema');

const customerInfo = async (req, res) => {
    try {
        let search = req.query.search || "";
        let page = parseInt(req.query.page) || 1;
        const limit = 5; 

        const searchRegex = new RegExp(".*" + search + ".*", "i");
        const query = {
            isAdmin: false,
            $or: [{ name: { $regex: searchRegex } }, { email: { $regex: searchRegex } }],
        };

        const customers = await User.find(query)
            .limit(limit)
            .skip((page - 1) * limit)
            .sort({ createdAt: -1 })
            .exec();

        const count = await User.countDocuments(query);
        const totalPages = Math.ceil(count / limit);

       
        res.render('customers', {
            customers: customers,
            totalPages: totalPages,
            currentPage: page,
            search: search
        });

    } catch (error) {
        console.log(error.message);
        res.status(500).render('admin-error');
    }
};

const blockUser = async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.params.id, { isBlocked: true });
        res.redirect('/admin/customers');
    } catch (error) {
        console.log(error.message);
        res.status(500).render('admin-error');
    }
};

const unblockUser = async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.params.id, { isBlocked: false });
        res.redirect('/admin/customers');
    } catch (error) {
        console.log(error.message);
        res.status(500).render('admin-error');
    }
};

module.exports = {
    customerInfo,
    blockUser,
    unblockUser
};
