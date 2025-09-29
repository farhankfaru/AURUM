const express = require("express");
const app = express();
const path = require("path");
const env = require("dotenv").config();
const session = require("express-session");
const MongoStore = require("connect-mongo");
const passport = require("./config/passport");
const connectDB = require("./config/db");
const flash = require('connect-flash');

const userRouter = require("./routes/userRouter");
const adminRouter = require('./routes/adminRouter');

// Database
connectDB();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Store server start time to detect restarts
const SERVER_START_TIME = Date.now();

// Session Configuration
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        touchAfter: 24 * 3600,
        crypto: { secret: process.env.SESSION_SECRET },
        collectionName: 'sessions',
        ttl: 72 * 60 * 60, // 72 hours in seconds
        autoRemove: 'native'
    }),
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 72 * 60 * 60 * 1000, // 72 hours in milliseconds
        sameSite: 'lax'
    },
    rolling: false,
    name: 'aurum.sid'
}));

// FIXED: Server restart session validation middleware - BEFORE flash
app.use((req, res, next) => {
    if (req.session && req.sessionID) {
        // Check if session was created before server restart
        if (req.session.loginTime && req.session.loginTime < SERVER_START_TIME) {
            console.log('Destroying old session from previous server instance');
            return req.session.destroy((err) => {
                if (err) console.error('Session destroy error:', err);
                res.clearCookie('aurum.sid');
                res.clearCookie('connect.sid');
                // Redirect to appropriate login page
                if (req.path.startsWith('/admin')) {
                    return res.redirect('/admin/login');
                }
                return res.redirect('/login');
            });
        }
    }
    next();
});

// FIXED: Flash middleware AFTER session validation
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

// ENHANCED CACHE PREVENTION HEADERS
app.use((req, res, next) => {
    // Strong cache prevention for ALL routes
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate, private, max-age=0');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('X-Frame-Options', 'DENY');
    res.set('X-XSS-Protection', '1; mode=block');
    
    // EXTRA strong cache prevention for admin routes
    if (req.path.startsWith('/admin')) {
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate, private, max-age=0, s-maxage=0');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '-1');
        res.set('Last-Modified', new Date(0).toUTCString());
        res.set('Surrogate-Control', 'no-store');
    }
    
    next();
});

// FIXED: Locals middleware with better error handling
app.use((req, res, next) => {
    try {
        res.locals.user = req.user || null;
        res.locals.success_msg = req.flash ? req.flash('success') : [];
        res.locals.error_msg = req.flash ? req.flash('error') : [];
    } catch (error) {
        console.error('Error setting locals:', error);
        res.locals.user = null;
        res.locals.success_msg = [];
        res.locals.error_msg = [];
    }
    next();
});

// Views Configuration
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));

// Routes
app.use("/", userRouter);
app.use('/admin', adminRouter);

// 404 handler
app.use((req, res) => {
    try {
        if (req.headers.accept?.indexOf('json') > -1) {
            return res.status(404).json({ 
                success: false, 
                message: 'Endpoint not found' 
            });
        }
        
        // Check if it's an admin route
        if (req.path.startsWith('/admin')) {
            res.status(404).render('admin/admin-error');
        } else {
            res.status(404).render('user/page-404');
        }
        
    } catch (err) {
        console.error('404 render error:', err);
        res.status(404).send('Page not found');
    }
});

// FIXED: Error handler with better session handling
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    
    if (req.headers.accept?.indexOf('json') > -1) {
        return res.status(500).json({ 
            success: false, 
            message: process.env.NODE_ENV === 'production' 
                ? 'Internal server error' 
                : err.message 
        });
    }
    
    // HTML error response - Check if admin or user route
    try {
        if (req.path.startsWith('/admin')) {
            res.status(500).render('admin/admin-error');
        } else {
            res.status(500).render('user/page-404', {
                error: process.env.NODE_ENV === 'production' 
                    ? 'Something went wrong' 
                    : err.message 
            });
        }
    } catch (renderErr) {
        res.status(500).send('Something went wrong');
    }
});

// Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 AURUM Server running on port ${PORT}`);
    console.log(`📧 Email service: ${process.env.NODEMAILER_EMAIL ? '✅ Configured' : '❌ Not configured'}`);
    console.log(`🔐 Session store: ${process.env.MONGODB_URI ? '✅ MongoDB' : '❌ Memory'}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`⏰ Server start time: ${SERVER_START_TIME}`);
});

module.exports = app;
