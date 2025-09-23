const User = require('../../models/userSchema');

const customerInfo = async (req, res) => {
    try {
        let search = req.query.search || "";
        let page = parseInt(req.query.page) || 1;
        const limit = 5; 
        const skip = (page - 1) * limit;

        const searchRegex = new RegExp(".*" + search.trim() + ".*", "i");
        const query = {
            isAdmin: false,
            $or: [{ name: { $regex: searchRegex } }, { email: { $regex: searchRegex } }],
        };

        const findCustomersWithTimeout = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Database query timeout'));
            }, 5000);
            
            Promise.all([
                User.find(query)
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .exec(),
                User.countDocuments(query)
            ]).then(([customers, count]) => {
                clearTimeout(timeout);
                resolve({ customers, count });
            }).catch(err => {
                clearTimeout(timeout);
                reject(err);
            });
        });

        const { customers, count } = await findCustomersWithTimeout;
        const totalPages = Math.ceil(count / limit);

        res.render('customers', {
            customers: customers,
            totalPages: totalPages,
            currentPage: page,
            search: search,
            success_msg: req.flash('success_msg'),
            error_msg: req.flash('error_msg')
        });

    } catch (error) {
        console.log("Error loading customer info:", error.message);
        
        if (error.message === 'Database query timeout') {
            req.flash('error_msg', 'Database temporarily unavailable. Please try again.');
        } else {
            req.flash('error_msg', 'Failed to load customers. Please try again.');
        }
        
        res.redirect('/admin/dashboard');
    }
};

const blockUser = async (req, res) => {
    try {
        const blockUserWithTimeout = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Database update timeout'));
            }, 3000);
            
            User.findByIdAndUpdate(req.params.id, { isBlocked: true })
                .then(result => {
                    clearTimeout(timeout);
                    resolve(result);
                })
                .catch(err => {
                    clearTimeout(timeout);
                    reject(err);
                });
        });

        await blockUserWithTimeout;
        req.flash('success_msg', 'User has been successfully blocked.');
        res.redirect('/admin/customers');
    } catch (error) {
        console.log("Error blocking user:", error.message);
        
        if (error.message === 'Database update timeout') {
            req.flash('error_msg', 'Operation timed out. Please try again.');
        } else {
            req.flash('error_msg', 'Error: Could not block the user.');
        }
        
        res.redirect('/admin/customers');
    }
};

const unblockUser = async (req, res) => {
    try {
        const unblockUserWithTimeout = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Database update timeout'));
            }, 3000);
            
            User.findByIdAndUpdate(req.params.id, { isBlocked: false })
                .then(result => {
                    clearTimeout(timeout);
                    resolve(result);
                })
                .catch(err => {
                    clearTimeout(timeout);
                    reject(err);
                });
        });

        await unblockUserWithTimeout;
        req.flash('success_msg', 'User has been successfully unblocked.');
        res.redirect('/admin/customers');
    } catch (error) {
        console.log("Error unblocking user:", error.message);
        
        if (error.message === 'Database update timeout') {
            req.flash('error_msg', 'Operation timed out. Please try again.');
        } else {
            req.flash('error_msg', 'Error: Could not unblock the user.');
        }
        
        res.redirect('/admin/customers');
    }
};

module.exports = {
    customerInfo,
    blockUser,
    unblockUser
};
