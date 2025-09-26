const User = require("../../models/userSchema");
const Category = require("../../models/categorySchema");
const bcrypt = require("bcrypt");

const isDev = process.env.NODE_ENV !== 'production';
const loadLogin = async (req, res) => {
    try {
        // CHECK IF ADMIN IS ALREADY LOGGED IN
        if (req.session && req.session.admin) {
            console.log("Admin already logged in, redirecting to dashboard");
            
            // Verify admin exists and is valid
            const admin = await User.findById(req.session.admin);
            if (admin && admin.isAdmin && !admin.isBlocked) {
                // Admin is already logged in - redirect to dashboard
                return res.redirect('/admin/dashboard');
            } else {
                // Invalid admin - clear session
                req.session.destroy();
                res.clearCookie('connect.sid');
                res.clearCookie('aurum.sid');
            }
        }
        
        // Show login page only if not authenticated
        return res.render('admin/admin-login');
        
    } catch (error) {
        console.error("Admin login page loading error:", error);
        return res.status(500).render('admin/admin-error');
    }
};

const login = async (req, res) => {
    try {
        console.log("Admin login attempt for:", req.body.email);
        
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Please provide both email and password"
            });
        }
        
        const findAdmin = await User.findOne({ 
            email: email.toLowerCase().trim(), 
            isAdmin: true 
        });
        
        console.log("Admin found:", findAdmin ? "YES" : "NO");
        
        if (!findAdmin) {
            return res.status(401).json({
                success: false,
                message: "Invalid admin credentials"
            });
        }
        
        if (findAdmin.isBlocked) {
            return res.status(403).json({
                success: false,
                message: "Your admin account has been blocked"
            });
        }
        
        const passwordMatch = await bcrypt.compare(password, findAdmin.password);
        console.log("Password correct:", passwordMatch);
        
        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid admin credentials"
            });
        }
        
        console.log("Setting session for admin:", findAdmin._id);
        req.session.admin = findAdmin._id.toString();
        
        return res.status(200).json({
            success: true,
            message: "Login successful",
            redirectUrl: "/admin/dashboard",
            admin: {
                id: findAdmin._id,
                email: findAdmin.email,
                name: findAdmin.name
            }
        });
        
    } catch (error) {
        console.error("Admin login error:", error);
        return res.status(500).json({
            success: false,
            message: "Login failed, please try again later"
        });
    }
};

const loadDashboard = async (req, res) => {
    try {
        console.log("=== LOAD DASHBOARD ===");
        
        if (!req.session.admin) {
            return res.redirect('/admin/login');
        }

        const admin = await User.findById(req.session.admin);
        if (!admin || !admin.isAdmin) {
            req.session.destroy();
            return res.redirect('/admin/login');
        }

        console.log("✅ Rendering dashboard for:", admin.email);
        
        res.render('admin/dashboard', {
            admin: admin,
            title: 'Dashboard - AURUM Admin',
            pageTitle: 'Dashboard',
            currentPage: 'dashboard'
        });
        
        console.log("✅ Dashboard rendered successfully");

    } catch (error) {
        console.error('❌ Dashboard loading error:', error);
        return res.status(500).send("Dashboard error: " + error.message);
    }
};

const loadCustomers = async (req, res) => {
    try {
        if (!req.session.admin) {
            return res.redirect('/admin/login');
        }

        const admin = await User.findById(req.session.admin);
        if (!admin || !admin.isAdmin) {
            req.session.destroy();
            return res.redirect('/admin/login');
        }

        res.render('admin/customers', {
            admin: admin,
            title: 'Customer Management - AURUM Admin',
            pageTitle: 'Customer Management',
            currentPage: 'customers'
        });
    } catch (error) {
        if (isDev) console.error('Customer management loading error:', error);
        return res.status(500).render('admin/admin-error');
    }
};

const loadCategories = async (req, res) => {
    try {
        if (!req.session.admin) {
            return res.redirect('/admin/login');
        }

        const admin = await User.findById(req.session.admin);
        if (!admin || !admin.isAdmin) {
            req.session.destroy();
            return res.redirect('/admin/login');
        }

        res.render('admin/categories', {
            admin: admin,
            title: 'Category Management - AURUM Admin',
            pageTitle: 'Category Management',
            currentPage: 'categories'
        });
    } catch (error) {
        if (isDev) console.error('Category management loading error:', error);
        return res.status(500).render('admin/admin-error');
    }
};

const pageerror = async (req, res) => {
    try {
        if (!req.session.admin) {
            return res.redirect('/admin/login');
        }

        const admin = await User.findById(req.session.admin);
        if (!admin || !admin.isAdmin) {
            req.session.destroy();
            return res.redirect('/admin/login');
        }

        res.render('admin/admin-error', {
            admin: admin,
            title: 'Error - AURUM Admin',
            pageTitle: 'Error'
        });
    } catch (error) {
        if (isDev) console.error('Error page loading error:', error);
        return res.status(500).send('Error loading error page');
    }
};

// ENHANCED LOGOUT FUNCTION WITH PROPER CACHE PREVENTION
const logout = async (req, res) => {
    try {
        console.log("=== ADMIN LOGOUT ===");
        console.log("Session before destroy:", !!req.session.admin);
        
        // Get session name for cookie clearing
        const sessionName = req.app.get('session cookie name') || 'aurum.sid';
        
        // Destroy session completely
        req.session.destroy((err) => {
            if (err) {
                console.error('Session destroy error:', err);
                return res.redirect('/admin/dashboard');
            }
            
            console.log("✅ Session destroyed successfully");
            
            // Clear ALL possible cookies
            res.clearCookie('connect.sid');
            res.clearCookie('aurum.sid');
            res.clearCookie(sessionName);
            
            // Set strong cache prevention headers
            res.set('Cache-Control', 'no-cache, no-store, must-revalidate, private, max-age=0');
            res.set('Pragma', 'no-cache');
            res.set('Expires', '-1');
            res.set('Last-Modified', new Date(0).toUTCString());
            
            console.log("✅ Admin logged out successfully");
            return res.redirect('/admin/login');
        });
        
    } catch (error) {
        console.error("Admin logout error:", error);
        // Clear cookies even if there's an error
        res.clearCookie('connect.sid');
        res.clearCookie('aurum.sid');
        return res.redirect('/admin/login');
    }
};

module.exports = {
    loadLogin,
    login,
    loadDashboard,
    loadCustomers,
    loadCategories,
    pageerror,
    logout
};
