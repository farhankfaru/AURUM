const User = require('../models/userSchema');

// Store server start time to detect restarts
const SERVER_START_TIME = Date.now();

// UPDATED USER AUTH WITH BLOCKED USER PREVENTION
const userAuth = async (req, res, next) => {
    try {
        let userId = req.session.user;
        
        if (!userId && req.user) {
            userId = req.user._id;
            req.session.user = userId;
        }
        
        if (userId) {
            const user = await User.findById(userId);
            
            // CRITICAL: Check if user exists and is not blocked
            if (user && !user.isBlocked && !user.isAdmin) {
                req.currentUser = user;
                return next();
            } else if (user && user.isBlocked) {
                // User is blocked - destroy session and redirect with message
                console.log("Blocked user attempted to access protected route:", user.email);
                req.session.destroy((err) => {
                    if (err) {
                        console.error('Session destroy error during blocked user redirect:', err);
                    }
                    res.clearCookie('connect.sid');
                    res.clearCookie('aurum.sid');
                    return res.redirect('/login?error=account_blocked');
                });
                return;
            } else if (!user) {
                // User deleted from DB - clean session and redirect to login
                console.log("Deleted user attempted to access protected route");
                req.session.destroy((err) => {
                    if (err) {
                        console.error('Session destroy error during deleted user redirect:', err);
                    }
                    res.clearCookie('connect.sid');
                    res.clearCookie('aurum.sid');
                    return res.redirect('/login');
                });
                return;
            }
        }
        
        return res.redirect('/login');
    } catch (error) {
        console.log('User auth middleware error:', error);
        return res.redirect('/login');
    }
};

// FIXED: ENHANCED ADMIN AUTH WITH SERVER RESTART DETECTION
const adminAuth = async (req, res, next) => {
    try {
        console.log("=== ADMIN AUTH MIDDLEWARE ===");
        console.log("Session admin:", req.session.admin);
        console.log("Session exists:", req.session ? "YES" : "NO");
        
        // CRITICAL: Set cache prevention headers for ALL admin routes
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate, private, max-age=0');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '-1');
        res.set('Last-Modified', new Date(0).toUTCString());
        
        if (req.session && req.session.admin) {
            console.log("Looking up admin with ID:", req.session.admin);
            
            // Convert ObjectId to string if needed
            const adminId = req.session.admin.toString ? req.session.admin.toString() : req.session.admin;
            
            const admin = await User.findById(adminId);
            
            console.log("Admin lookup result:", admin ? "FOUND" : "NOT FOUND");
            
            if (admin && admin.isAdmin && !admin.isBlocked) {
                console.log("✅ Admin authenticated successfully");
                req.currentAdmin = admin;
                return next();
            } else if (admin && admin.isBlocked) {
                console.log("❌ Admin is blocked");
                // Enhanced session cleanup
                req.session.destroy((err) => {
                    if (err) console.error('Session destroy error:', err);
                });
                res.clearCookie('connect.sid');
                res.clearCookie('aurum.sid');
                // Set cache headers before redirect
                res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
                return res.redirect('/admin/login');
            } else if (!admin) {
                console.log("❌ Admin not found in database");
                // Enhanced session cleanup
                req.session.destroy((err) => {
                    if (err) console.error('Session destroy error:', err);
                });
                res.clearCookie('connect.sid');
                res.clearCookie('aurum.sid');
                // Set cache headers before redirect
                res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
                return res.redirect('/admin/login');
            }
        }
        
        console.log("❌ No admin session found");
        // Set cache headers before redirect
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        return res.redirect('/admin/login');
        
    } catch (error) {
        console.error('❌ Admin auth middleware error:', error);
        // Clear session on error and set cache headers
        if (req.session) {
            req.session.destroy((err) => {
                if (err) console.error('Session destroy error during auth error:', err);
            });
        }
        res.clearCookie('connect.sid');
        res.clearCookie('aurum.sid');
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        return res.redirect('/admin/login');
    }
};

// Enhanced guest middleware - allows OTP verification flow + handles deleted users
const guestOnly = (req, res, next) => {
    // Allow access if user is in OTP verification process
    if (req.session.userData && req.session.userOtp && req.path === '/verify-otp') {
        return next();
    }
    
    // Allow access if user is in password reset process
    if (req.session.resetUserId && (req.path === '/forgot-password-otp' || req.path === '/reset-password')) {
        return next();
    }
    
    // Simple session check - no DB query unless necessary
    if (req.session.user || (req.user && req.user._id)) {
        return res.redirect('/');
    }
    
    next();
};

// FIXED: Admin guest middleware with better session handling and back button prevention
const adminGuestOnly = (req, res, next) => {
    // CRITICAL: Set cache prevention headers to prevent back button access
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate, private, max-age=0');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '-1');
    res.set('Last-Modified', new Date(0).toUTCString());
    
    // Check if admin is already logged in
    if (req.session && req.session.admin) {
        console.log("Admin session found in adminGuestOnly");
        
        // Verify the admin session is still valid
        User.findById(req.session.admin)
            .then(admin => {
                if (admin && admin.isAdmin && !admin.isBlocked) {
                    console.log("Admin already authenticated, redirecting to dashboard");
                    return res.redirect('/admin/dashboard');
                } else {
                    // Invalid admin - destroy session
                    req.session.destroy((err) => {
                        if (err) console.error('Session destroy error:', err);
                    });
                    res.clearCookie('connect.sid');
                    res.clearCookie('aurum.sid');
                    return next(); // Allow access to login page
                }
            })
            .catch(error => {
                console.error('Error verifying admin in adminGuestOnly:', error);
                // On error, destroy session and allow login
                req.session.destroy((err) => {
                    if (err) console.error('Session destroy error:', err);
                });
                res.clearCookie('connect.sid');
                res.clearCookie('aurum.sid');
                return next();
            });
    } else {
        next();
    }
};

// Additional middleware for OTP verification pages
const otpRequired = (req, res, next) => {
    if (!req.session.userData || !req.session.userOtp) {
        return res.redirect('/signup');
    }
    next();
};

// Additional middleware for reset password flow
const resetFlowRequired = (req, res, next) => {
    if (!req.session.resetUserId) {
        return res.redirect('/forgot-password');
    }
    next();
};

// Additional middleware to ensure OTP was verified before password reset
const otpVerifiedRequired = (req, res, next) => {
    if (!req.session.resetUserId) {
        return res.redirect('/forgot-password');
    }
    
    // If OTP is still in session, user hasn't verified it yet
    if (req.session.resetOtp) {
        return res.redirect('/forgot-password-otp');
    }
    
    next();
};

module.exports = {
    userAuth,
    adminAuth,
    guestOnly,
    adminGuestOnly,
    otpRequired,
    resetFlowRequired,
    otpVerifiedRequired
};
