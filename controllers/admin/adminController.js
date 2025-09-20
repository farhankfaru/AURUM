const User = require('../../models/userSchema');
const bcrypt = require('bcrypt');

const pageerror = (req, res) => {
    try {
        
        res.status(500).render('admin-error');
    } catch (error) {
        console.error('CRITICAL: Failed to render admin-error page.', error);
        res.status(500).send('A critical server error occurred.');
    }
};

const loadLogin = (req, res) => {
    if (req.session.admin) {
        return res.redirect('/admin/dashboard');
    }

    res.render('admin-login', { message: null });
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.render('admin-login', { message: "Please provide both email and password" });
        }
        const admin = await User.findOne({ email: email.toLowerCase().trim(), isAdmin: true });
        if (!admin) {
            return res.render('admin-login', { message: "Invalid admin credentials" });
        }
        if (admin.isBlocked) {
            return res.render('admin-login', { message: "This admin account has been suspended." });
        }
        const passwordMatch = await bcrypt.compare(password, admin.password);
        if (passwordMatch) {
            req.session.admin = admin._id;
            return res.redirect('/admin/dashboard');
        } else {
            return res.render('admin-login', { message: "Invalid admin credentials" });
        }
    } catch (error) {
        console.error('Critical Admin login error:', error);
        return res.status(500).render('admin-error');
    }
};

const loadDashboard = async (req, res) => {
    try {
        if (!req.session.admin) {
            return res.redirect('/admin/login');
        }
        const admin = await User.findById(req.session.admin);
        if (!admin || !admin.isAdmin) {
            req.session.destroy();
            return res.redirect('/admin/login');
        }
       
        res.render('dashboard', { admin: admin });
    } catch (error) {
        console.error('Dashboard loading error:', error);
        return res.status(500).render('admin-error');
    }
};

const logout = async (req, res) => {
    try {
        req.session.destroy((err) => {
            if (err) {
                console.error('Admin logout session destruction error:', err);
                return res.redirect('/admin/dashboard');
            }
            res.clearCookie('connect.sid');
            return res.redirect('/admin/login');
        });
    } catch (error) {
        console.error("Critical Admin logout error:", error);
        return res.redirect('/admin/login');
    }
};

module.exports = {
    loadLogin,
    login,
    loadDashboard,
    logout,
    pageerror
};
