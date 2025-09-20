const express = require("express");
const router = express.Router();
const passport = require('passport');
const userController = require("../controllers/user/userController");


router.get("/pageNotFound", userController.pageNotFound);
router.get("/", userController.loadHomepage);
router.post('/logout', userController.logout);
router.get("/signup", userController.loadSignup);
router.post("/signup", userController.signup);
router.post("/verify-otp", userController.verifyOtp);
router.post("/resend-otp", userController.resendOtp);
router.get('/login', userController.loadLogin);
router.post('/login', userController.login);




router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));


router.get('/auth/google/callback',
    
    passport.authenticate('google', { failureRedirect: "/signup" }),

   
    (req, res) => {
        
        if (req.user) {
           
            req.session.user = req.user._id;
            console.log('Google Auth Success: Session created for user ID:', req.session.user);
        }
        
        
        res.redirect('/');
    }
);

module.exports = router;
