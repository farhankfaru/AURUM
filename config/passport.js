const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/userSchema");
const env = require("dotenv").config();

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback"
}, 
async (accessToken, refreshToken, profile, done) => {
    try {
        console.log("Google OAuth Profile:", profile);
        
        let user = await User.findOne({ googleId: profile.id });
        
        if (user) {
            console.log("Found existing Google user:", user.email);
            
            // CRITICAL: Check if Google user is blocked
            if (user.isBlocked) {
                console.log("Google user is blocked:", user.email);
                return done(null, false, { message: 'Your account has been blocked by admin.' });
            }
            
            return done(null, user);
        }
        
        const existingEmailUser = await User.findOne({ 
            email: profile.emails[0].value.toLowerCase() 
        });
        
        if (existingEmailUser) {
            console.log("Linking Google account to existing user:", existingEmailUser.email);
            
            // CRITICAL: Check if existing user is blocked
            if (existingEmailUser.isBlocked) {
                console.log("Existing user is blocked:", existingEmailUser.email);
                return done(null, false, { message: 'Your account has been blocked by admin.' });
            }
            
            existingEmailUser.googleId = profile.id;
            await existingEmailUser.save();
            return done(null, existingEmailUser);
        }
        
        user = new User({
            name: profile.displayName,
            email: profile.emails[0].value.toLowerCase(),
            googleId: profile.id,
            isBlocked: false,
            isAdmin: false
        });
        
        await user.save();
        console.log("Created new Google user:", user.email);
        return done(null, user);
        
    } catch (error) {
        console.error("Google OAuth Error:", error);
        return done(error, null);
    }
}));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    User.findById(id)
        .then(user => {
            done(null, user);
        })
        .catch(err => {
            done(err, null);
        });
});

module.exports = passport;
