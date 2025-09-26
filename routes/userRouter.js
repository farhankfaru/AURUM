const express = require('express');
const router = express.Router();
const userController = require('../controllers/user/userController');
const { userAuth, guestOnly, otpRequired, resetFlowRequired, otpVerifiedRequired } = require('../middlewares/auth');
const passport = require('../config/passport');

// Homepage
router.get('/', userController.loadHomepage);
router.get('/pagenotfound', userController.pageNotFound);

// Authentication routes
router.get('/signup', guestOnly, userController.loadSignup);
router.post('/signup', userController.signup);
router.get('/verify-otp', otpRequired, userController.loadVerifyOtp);
router.post('/verify-otp', userController.verifyOtp);
router.put('/resend-otp', userController.resendOtp);

router.get('/login', guestOnly, userController.loadLogin);
router.post('/login', userController.login);

// Forgot password routes
router.get('/forgot-password', guestOnly, userController.loadForgotPassword);
router.post('/forgot-password', userController.sendForgotPasswordOtp);
router.get('/forgot-password-otp', resetFlowRequired, userController.loadForgotPasswordOtp);
router.post('/forgot-password-otp', userController.verifyForgotPasswordOtp);
router.put('/forgot-password-resend', userController.resendForgotPasswordOtp);
router.get('/reset-password', otpVerifiedRequired, userController.loadResetPassword);
router.post('/reset-password', userController.resetPassword);

router.get('/logout', userController.logout);

// Google OAuth routes - SIGNUP CONTEXT
router.get('/auth/google/signup', 
    guestOnly, // Added to prevent logged-in users
    (req, res, next) => {
        console.log("Google signup route accessed");
        req.session.authContext = 'signup';
        req.session.save((err) => {
            if (err) {
                console.error('Session save error:', err);
                return res.redirect('/signup?error=session_error');
            }
            console.log("Session context set to signup:", req.session.authContext);
            next();
        });
    },
    passport.authenticate('google', { 
        scope: ['profile', 'email'],
        prompt: 'select_account'
    })
);

// Google OAuth routes - LOGIN CONTEXT  
router.get('/auth/google/login',
    guestOnly, // Added to prevent logged-in users
    (req, res, next) => {
        console.log("Google login route accessed");
        req.session.authContext = 'login';
        req.session.save((err) => {
            if (err) {
                console.error('Session save error:', err);
                return res.redirect('/login?error=session_error');
            }
            console.log("Session context set to login:", req.session.authContext);
            next();
        });
    },
    passport.authenticate('google', { 
        scope: ['profile', 'email'],
        prompt: 'select_account'
    })
);

// Legacy route (defaults to login)
router.get('/auth/google', 
    guestOnly, // Added to prevent logged-in users
    (req, res, next) => {
        console.log("Google auth route accessed (default login)");
        req.session.authContext = 'login';
        req.session.save((err) => {
            if (err) {
                console.error('Session save error:', err);
                return res.redirect('/login?error=session_error');
            }
            next();
        });
    },
    passport.authenticate('google', { 
        scope: ['profile', 'email'],
        prompt: 'select_account'
    })
);

// Google OAuth callback
router.get('/auth/google/callback', 
    passport.authenticate('google', { 
        failureRedirect: '/login?error=google_auth_failed',
        session: true
    }), 
    userController.googleAuthCallback
);

// Handle auth failures
router.get('/auth/google/failure', userController.googleAuthFailure);

// API Routes
router.get('/api/categories/active', userController.getActiveCategories);

module.exports = router;
