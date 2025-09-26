const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/userSchema");
const env = require("dotenv").config();

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback",
    passReqToCallback: true // IMPORTANT: This allows us to access req in the callback
}, 
async (req, accessToken, refreshToken, profile, done) => {
    try {
        console.log("Google OAuth Profile:", profile.id, profile.emails[0].value);
        console.log("Session auth context:", req.session.authContext);
        
        const authContext = req.session.authContext || 'login';
        const email = profile.emails[0].value.toLowerCase();
        
        // Check if user already exists with this Google ID
        let existingGoogleUser = await User.findOne({ googleId: profile.id });
        
        if (existingGoogleUser) {
            console.log("Found existing Google user:", existingGoogleUser.email);
            
            // CRITICAL: Check if Google user is blocked
            if (existingGoogleUser.isBlocked) {
                console.log("BLOCKED Google user attempted login:", existingGoogleUser.email);
                return done(null, false, { message: 'blocked' });
            }
            
            // CRITICAL: Check if user is admin (shouldn't login via Google on user side)
            if (existingGoogleUser.isAdmin) {
                console.log("Admin user attempted Google login on user side:", existingGoogleUser.email);
                return done(null, false, { message: 'admin_not_allowed' });
            }
            
            // If trying to signup with existing Google account, prevent it
            if (authContext === 'signup') {
                console.log("Blocking signup attempt for existing Google user");
                return done(null, false, { message: 'google_user_exists', email: existingGoogleUser.email });
            }
            
            // Update last login timestamp
            existingGoogleUser.lastLogin = new Date();
            await existingGoogleUser.save();
            
            return done(null, existingGoogleUser);
        }
        
        // Check if user exists with same email (different auth method)
        const existingEmailUser = await User.findOne({ 
            email: email,
            isAdmin: false // Only check regular users, not admins
        });
        
        if (existingEmailUser) {
            console.log("Found user with same email (non-Google):", existingEmailUser.email);
            
            // CRITICAL: Check if existing user is blocked
            if (existingEmailUser.isBlocked) {
                console.log("BLOCKED existing user attempted Google login:", existingEmailUser.email);
                return done(null, false, { message: 'blocked' });
            }
            
            // If trying to signup, prevent linking to existing email
            if (authContext === 'signup') {
                console.log("Blocking signup attempt for existing email");
                return done(null, false, { message: 'email_exists', email: existingEmailUser.email });
            }
            
            // For login, link Google account to existing user
            existingEmailUser.googleId = profile.id;
            existingEmailUser.lastLogin = new Date();
            await existingEmailUser.save();
            console.log("Linked Google account to existing user:", existingEmailUser.email);
            return done(null, existingEmailUser);
        }
        
        // Only create new user if in signup context
        if (authContext === 'signup') {
            const newGoogleUser = new User({
                name: profile.displayName,
                email: email,
                googleId: profile.id,
                phone: null,
                password: null,
                isBlocked: false,
                isAdmin: false,
                lastLogin: new Date()
            });
            
            await newGoogleUser.save();
            console.log("Created new Google user:", newGoogleUser.email);
            return done(null, newGoogleUser);
        }
        
        // If login context but no user found
        console.log("No user found for login attempt with email:", email);
        return done(null, false, { message: 'user_not_found' });
        
    } catch (error) {
        console.error("Google OAuth Error:", error);
        return done(error, null);
    }
}));

passport.serializeUser((user, done) => {
    console.log("Serializing user:", user._id);
    done(null, user._id);
});

// ENHANCED: deserializeUser with blocked user check
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        
        if (!user) {
            console.log("User not found during deserialization:", id);
            return done(null, false);
        }
        
        // CRITICAL: Check if user is blocked during session deserialization
        if (user.isBlocked) {
            console.log("BLOCKED user session deserialized - invalidating:", user.email);
            return done(null, false); // This will force logout
        }
        
        // Check if user is admin trying to access user side
        if (user.isAdmin) {
            console.log("Admin user session on user side - invalidating:", user.email);
            return done(null, false);
        }
        
        done(null, user);
    } catch (error) {
        console.error("Deserialize error:", error);
        done(error, null);
    }
});

module.exports = passport;
