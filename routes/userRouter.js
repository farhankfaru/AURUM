const express = require("express");
const router = express.Router();
const passport = require('passport');
const userController = require("../controllers/user/userController");


router.get("/pageNotFound", userController.pageNotFound);
router.get("/", userController.loadHomepage);


router.get("/signup", userController.loadSignup);
router.post("/signup", userController.signup);
router.post("/verify-otp", userController.verifyOtp);
router.post("/resend-otp", userController.resendOtp);
router.get('/login', userController.loadLogin);
router.post('/login', userController.login);
router.post('/logout', userController.logout);


router.get('/auth/google', 
    passport.authenticate('google', { 
        scope: ['profile', 'email'] 
    })
);


router.get('/auth/google/callback',
    passport.authenticate('google', { 
        failureRedirect: '/login',     
        failureFlash: true           
    }),
    userController.googleSuccess      
);


router.get('/auth/google/failure', userController.googleFailure);

module.exports = router;
