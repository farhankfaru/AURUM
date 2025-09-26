const User = require("../../models/userSchema");
const Category = require("../../models/categorySchema");
const nodemailer = require("nodemailer");
const env = require("dotenv").config();
const bcrypt = require("bcrypt");

const pageNotFound = async (req, res) => {
    try {
        res.render("user/page-404"); // FIXED: Added user/ path
    } catch (error) {
        res.redirect("/pageNotFound");
    }
};

function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendVerificationEmail(email, otp, name) {
    try {
        console.log("Attempting to send verification email to:", email);
        console.log("Email config:", {
            user: process.env.NODEMAILER_EMAIL,
            pass: process.env.NODEMAILER_PASSWORD ? "***SET***" : "***NOT SET***"
        });

        if (!process.env.NODEMAILER_EMAIL || !process.env.NODEMAILER_PASSWORD) {
            console.error("Email credentials not set in .env file");
            return false;
        }

        const transporter = nodemailer.createTransport({ 
            service: 'gmail',
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD
            }
        });

        await transporter.verify();
        console.log("Email transporter verified");
        
        const info = await transporter.sendMail({
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "Verify your AURUM account",
            text: `Your OTP for AURUM verification is ${otp}`,
            html: `
                <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 20px;">
                    <div style="background: white; border-radius: 15px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
                        <div style="background: linear-gradient(135deg, #8B7355 0%, #A0956B 100%); padding: 40px 30px; text-align: center;">
                            <h1 style="color: #F5F5DC; font-size: 2.5rem; font-weight: 700; letter-spacing: 0.2em; margin: 0;">AURUM</h1>
                            <p style="color: rgba(245, 245, 220, 0.9); font-size: 1rem; margin: 10px 0 0;">Timeless Elegance</p>
                        </div>
                        <div style="padding: 40px 30px;">
                            <h2 style="color: #8B7355; font-size: 1.8rem; margin-bottom: 20px;">Welcome to AURUM, ${name}!</h2>
                            <p style="color: #6B5B47; font-size: 1rem; line-height: 1.6; margin-bottom: 30px;">
                                Thank you for joining our exclusive community. To complete your registration and access our timeless collection, please verify your email address.
                            </p>
                            <div style="background: #f8f6f3; border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0;">
                                <p style="color: #8B7355; font-size: 1rem; font-weight: 600; margin-bottom: 15px;">Your Verification Code:</p>
                                <div style="background: #8B7355; color: white; font-size: 2.5rem; font-weight: 700; padding: 20px; border-radius: 10px; letter-spacing: 0.5em; margin: 20px 0;">${otp}</div>
                                <p style="color: #6B5B47; font-size: 0.9rem; margin-top: 15px;">This code expires in 10 minutes</p>
                            </div>
                        </div>
                    </div>
                </div>
            `,
        });
        
        console.log("Verification email sent successfully:", info.messageId);
        return info.accepted.length > 0;
        
    } catch (error) {
        console.error("Email sending error:", error.message);
        return false;
    }
}

async function sendResetPasswordEmail(email, otp, name) {
    try {
        console.log("Attempting to send reset password email to:", email);

        if (!process.env.NODEMAILER_EMAIL || !process.env.NODEMAILER_PASSWORD) {
            console.error("Email credentials not set in .env file");
            return false;
        }

        const transporter = nodemailer.createTransport({ 
            service: 'gmail',
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD
            }
        });

        await transporter.verify();
        console.log("Email transporter verified");
        
        const info = await transporter.sendMail({
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "AURUM - Reset Your Password",
            text: `Your OTP for AURUM password reset is ${otp}`,
            html: `
                <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 20px;">
                    <div style="background: white; border-radius: 15px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
                        <div style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); padding: 40px 30px; text-align: center;">
                            <h1 style="color: #F5F5DC; font-size: 2.5rem; font-weight: 700; letter-spacing: 0.2em; margin: 0;">AURUM</h1>
                            <p style="color: rgba(245, 245, 220, 0.9); font-size: 1rem; margin: 10px 0 0;">Password Reset</p>
                        </div>
                        <div style="padding: 40px 30px;">
                            <h2 style="color: #dc3545; font-size: 1.8rem; margin-bottom: 20px;">Reset Your Password</h2>
                            <p style="color: #6B5B47; font-size: 1rem; line-height: 1.6; margin-bottom: 30px;">
                                Hello ${name}, we received a request to reset your password. Use the verification code below to proceed.
                            </p>
                            <div style="background: #f8f6f3; border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0;">
                                <p style="color: #dc3545; font-size: 1rem; font-weight: 600; margin-bottom: 15px;">Your Reset Code:</p>
                                <div style="background: #dc3545; color: white; font-size: 2.5rem; font-weight: 700; padding: 20px; border-radius: 10px; letter-spacing: 0.5em; margin: 20px 0;">${otp}</div>
                                <p style="color: #6B5B47; font-size: 0.9rem; margin-top: 15px;">This code expires in 10 minutes</p>
                            </div>
                            <p style="color: #6B5B47; font-size: 0.9rem; line-height: 1.5;">
                                If you didn't request a password reset, please ignore this email.
                            </p>
                        </div>
                    </div>
                </div>
            `,
        });
        
        console.log("Reset password email sent successfully:", info.messageId);
        return info.accepted.length > 0;
        
    } catch (error) {
        console.error("Reset email sending error:", error.message);
        return false;
    }
}

const loadSignup = async (req, res) => {
    try {
        const error = req.query.error;
        let message = null;
        
        if (error === 'google_auth_failed') {
            message = 'Google authentication failed. Please try again.';
        } else if (error === 'google_user_blocked') {
            message = 'Your account has been blocked by admin. Please contact support.';
        } else if (error === 'google_user_exists') {
            message = 'This Google account is already registered. Please sign in instead.';
        } else if (error === 'email_exists') {
            message = 'An account with this email already exists. Please sign in instead.';
        }
        
        return res.render("user/signup", { message }); // FIXED: Added user/ path
    } catch (error) {
        console.log('Signup page not loading:', error);
        res.status(500).send("Server Error");
    }
};

const securePassword = async (password) => {
    try {
        const passwordHash = await bcrypt.hash(password, 10);
        return passwordHash;
    } catch(error) {
        console.error("Password hashing error:", error);
        throw error;
    }
};

const signup = async (req, res) => {
    try {
        console.log("=== SIGNUP ATTEMPT START ===");
        console.log("Request body:", req.body);
        console.log("Is API request?", req.headers.accept?.includes('application/json'));

        const { name, email, phone, password, confirmPassword } = req.body;
        
        const isApiRequest = req.headers.accept?.includes('application/json');
        
        if (!name || !email || !phone || !password || !confirmPassword) {
            const message = "All fields are required";
            console.log("Missing required fields");
            return isApiRequest 
                ? res.status(400).json({ success: false, message })
                : res.render("user/signup", { message }); // FIXED: Added user/ path
        }
        
        if (password !== confirmPassword) {
            const message = "Passwords do not match";
            console.log("Passwords don't match");
            return isApiRequest 
                ? res.status(400).json({ success: false, message })
                : res.render("user/signup", { message }); // FIXED: Added user/ path
        }
        
        const findUser = await User.findOne({ email: email.toLowerCase() });
        if (findUser) {
            const message = "User with this email already exists";
            console.log("User already exists:", email);
            return isApiRequest
                ? res.status(409).json({ success: false, message })
                : res.render("user/signup", { message }); // FIXED: Added user/ path
        }
        
        const otp = generateOtp();
        console.log("Generated OTP:", otp);
        
        console.log("Attempting to send verification email...");
        const emailSent = await sendVerificationEmail(email, otp, name);

        if (!emailSent) {
            console.log("Email sending failed");
            const message = "Failed to send verification email. Please check your email address and try again.";
            return isApiRequest
                ? res.status(500).json({ success: false, message })
                : res.render("user/signup", { message }); // FIXED: Added user/ path
        }
        
        console.log("Email sent successfully");
        
        req.session.userOtp = otp;
        req.session.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
        req.session.userData = { 
            name, 
            email: email.toLowerCase(), 
            phone, 
            password 
        };
        
        console.log("Session data stored");
        
        if (isApiRequest) {
            console.log("API Request - returning JSON response");
            return res.json({ 
                success: true, 
                message: 'Registration successful! Please check your email for verification code.',
                redirectUrl: '/verify-otp'
            });
        } else {
            console.log("Regular form submission - REDIRECTING to /verify-otp");
            return res.redirect('/verify-otp');
        }

    } catch (error) {
        console.error("Signup error:", error);
        const message = "An error occurred during signup. Please try again.";
        return req.headers.accept?.includes('application/json')
            ? res.status(500).json({ success: false, message })
            : res.render("user/signup", { message }); // FIXED: Added user/ path
    }
};

const loadVerifyOtp = async (req, res) => {
    try {
        console.log("=== VERIFY OTP PAGE LOADING ===");
        console.log("Session userData:", req.session.userData ? "EXISTS" : "MISSING");
        console.log("Session userOtp:", req.session.userOtp ? "EXISTS" : "MISSING");
        
        if (!req.session.userData || !req.session.userOtp) {
            console.log("Missing session data, redirecting to signup");
            return res.redirect('/signup');
        }
        
        const error = req.query.error;
        let message = null;
        
        if (error === 'invalid_otp') {
            message = 'Invalid OTP. Please try again.';
        } else if (error === 'expired_otp') {
            message = 'OTP has expired. Please request a new one.';
        }
        
        console.log("Rendering verify-otp page for email:", req.session.userData.email);
        res.render("user/verify-otp", { email: req.session.userData.email, message }); // FIXED: Added user/ path
    } catch (error) {
        console.error("OTP page loading error:", error);
        res.redirect('/signup');
    }
};

const verifyOtp = async (req, res) => {
    try {
        console.log("=== OTP VERIFICATION START ===");
        const { otp } = req.body;
        console.log("Received OTP:", otp);
        console.log("Session OTP:", req.session.userOtp);
        
        if (!otp || otp.length !== 6) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid 6-digit OTP"
            });
        }
        
        if (!/^\d{6}$/.test(otp)) {
            return res.status(400).json({
                success: false,
                message: "OTP must contain only numbers"
            });
        }
        
        if (!req.session.userOtp || !req.session.userData) {
            console.log("Session expired");
            return res.status(400).json({
                success: false,
                message: "OTP session expired. Please signup again"
            });
        }
        
        if (req.session.otpExpires && req.session.otpExpires < new Date()) {
            console.log("OTP expired");
            return res.status(400).json({
                success: false,
                message: "OTP has expired. Please request a new one"
            });
        }
        
        if (otp === req.session.userOtp) {
            console.log("OTP matches! Creating user...");
            const user = req.session.userData;
            const passwordHash = await securePassword(user.password);
            
            const saveUserData = new User({
                name: user.name,
                email: user.email,
                phone: user.phone,
                password: passwordHash, 
                isBlocked: false,
                isAdmin: false
            });
            
            await saveUserData.save();
            console.log("User created in database:", saveUserData._id);
            
            req.session.user = saveUserData._id;
            
            delete req.session.userOtp;
            delete req.session.otpExpires;
            delete req.session.userData;
            
            console.log("User logged in, session cleaned");
            
            res.json({ success: true, redirectUrl: "/" });
        } else {
            console.log("OTP mismatch");
            res.status(400).json({ success: false, message: "Invalid OTP. Please try again" });  
        }
        
    } catch (error) {
        console.error("OTP verification error:", error);
        res.status(500).json({
            success: false,
            message: "An error occurred during verification"
        });
    }
};

const resendOtp = async (req, res) => {
    try {
        console.log("=== RESEND OTP START ===");
        
        if (!req.session.userData) {
            console.log("No session data for resend");
            return res.status(400).json({
                success: false,
                message: "Session expired. Please signup again"
            });
        }
        
        const userData = req.session.userData;
        const newOtp = generateOtp();
        console.log("Generated new OTP:", newOtp);
        
        const emailSent = await sendVerificationEmail(userData.email, newOtp, userData.name);
        
        if (!emailSent) {
            console.log("Failed to send new OTP email");
            return res.status(500).json({
                success: false,
                message: "Failed to send OTP email. Please try again"
            });
        }
        
        req.session.userOtp = newOtp;
        req.session.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
        
        console.log("New OTP sent and session updated");
        
        res.status(200).json({
            success: true,
            message: "New OTP sent successfully!"
        });
        
    } catch (error) {
        console.error("Resend OTP error:", error);
        res.status(500).json({
            success: false,
            message: "Server error while resending OTP"
        });
    }
};

const loadLogin = async (req, res) => {
    try {
        if (!req.session.user && !req.user) {
            const error = req.query.error;
            let message = null;
            
            if (error === 'google_auth_failed') {
                message = 'Google authentication failed. Please try again.';
            } else if (error === 'google_user_blocked') {
                message = 'Your account has been blocked by admin. Please contact support.';
            } else if (error === 'user_not_found') {
                message = 'No account found with this Google account. Please sign up first.';
            } else if (error === 'account_blocked') {
                message = 'Your account has been blocked by admin. Please contact support.';
            } else if (error === 'admin_not_allowed') {
                message = 'Admin accounts cannot login here. Please use the admin portal.';
            }
            
            return res.render("user/login", { message }); // FIXED: Added user/ path
        } else {
            res.redirect('/');
        }
    } catch (error) {
        res.redirect('pageNotFound');
    }
};

const loadHomepage = async (req, res) => {
    try {
        let user = null;
        
        // Only query user if session exists
        if (req.session.user) {
            try {
                user = await User.findById(req.session.user).lean(); // .lean() for faster queries
                
                // Only check if user was found
                if (user && user.isBlocked) {
                    req.session.destroy();
                    return res.redirect('/login?error=account_blocked');
                }
                
                // If user deleted, clean up silently
                if (!user) {
                    req.session.destroy();
                    res.clearCookie('connect.sid');
                }
            } catch (dbError) {
                console.error("Database error:", dbError);
                // Don't block the homepage, just clean session
                req.session.destroy();
                res.clearCookie('connect.sid');
                user = null;
            }
        }
        
        // Get categories (with lean for performance)
        const categories = await Category.find({ 
            islisted: true, 
            isDeleted: false 
        }).lean().sort({ createdAt: -1 });
        
        res.render('user/home', { user, categories });
        
    } catch (error) {
        console.log("Home page error:", error);
        res.status(500).send("Server Error");
    }
};



// UPDATED LOGIN FUNCTION WITH BLOCKED USER PREVENTION
const login = async (req, res) => {
    try {
        console.log("=== LOGIN ATTEMPT START ===");
        console.log("Request body:", req.body);
        
        const { email, password } = req.body;
        
        if (!email || !password) {
            console.log("Missing email or password");
            return res.render("user/login", { message: "Please provide both email and password" }); // FIXED: Added user/ path
        }
        
        console.log("Searching for user with email:", email);
        
        const findUser = await User.findOne({ email: email.toLowerCase().trim(), isAdmin: false });
        
        if (!findUser) {
            console.log("User not found in database");
            return res.render("user/login", { message: "Invalid email or password" }); // FIXED: Added user/ path
        }
        
        console.log("User found:", findUser.email);
        console.log("  - isAdmin:", findUser.isAdmin);
        console.log("  - isBlocked:", findUser.isBlocked);
        console.log("  - Password exists:", findUser.password ? "YES" : "NO");
        
        // CRITICAL: Check if user is blocked FIRST before password verification
        if (findUser.isBlocked === true) {
            console.log("User is blocked - LOGIN DENIED");
            return res.render("user/login", { // FIXED: Added user/ path
                message: "Your account has been blocked by admin. Please contact support for assistance." 
            });
        }
        
        if (!findUser.password) {
            console.log("User has no password hash in database");
            return res.render("user/login", { message: "Please sign in with Google" }); // FIXED: Added user/ path
        }
        
        console.log("Comparing passwords...");
        
        const passwordMatch = await bcrypt.compare(password, findUser.password);
        console.log("Password match result:", passwordMatch);
        
        if (!passwordMatch) {
            console.log("Password does not match");
            return res.render('user/login', { message: "Invalid email or password" }); // FIXED: Added user/ path
        }
        
        console.log("LOGIN SUCCESSFUL!");
        req.session.user = findUser._id;
        console.log("Session set for user ID:", findUser._id);
        
        return res.redirect("/");
        
    } catch (error) {
        console.error("LOGIN ERROR:", error);
        return res.render('user/login', { message: "Login failed, please try again later" }); // FIXED: Added user/ path
    }
};

const loadForgotPassword = async (req, res) => {
    try {
        const error = req.query.error;
        let message = null;
        
        if (error === 'user_not_found') {
            message = 'No account found with this email address.';
        } else if (error === 'google_user') {
            message = 'This account uses Google sign-in. Please login with Google.';
        } else if (error === 'account_blocked') {
            message = 'Your account has been blocked by admin. Please contact support.';
        }
        
        res.render('user/forgot-password', { message }); // FIXED: Added user/ path
    } catch (error) {
        console.error('Forgot password page error:', error);
        res.redirect('/login');
    }
};

// UPDATED FORGOT PASSWORD WITH BLOCKED USER PREVENTION
const sendForgotPasswordOtp = async (req, res) => {
    try {
        const { email } = req.body;
        
        const isApiRequest = req.headers.accept?.includes('application/json');
        
        if (!email) {
            const message = 'Email is required';
            return isApiRequest 
                ? res.status(400).json({ success: false, message })
                : res.render('user/forgot-password', { message }); // FIXED: Added user/ path
        }
        
        const user = await User.findOne({ email: email.toLowerCase() });
        
        if (!user) {
            const message = 'No account found with this email address.';
            return isApiRequest
                ? res.status(404).json({ success: false, message })
                : res.redirect('/forgot-password?error=user_not_found');
        }
        
        // CRITICAL: Check if user is blocked before allowing password reset
        if (user.isBlocked) {
            const message = 'Your account has been blocked by admin. Please contact support.';
            return isApiRequest
                ? res.status(403).json({ success: false, message })
                : res.redirect('/forgot-password?error=account_blocked');
        }
        
        if (user.googleId && !user.password) {
            const message = 'This account uses Google sign-in. Please login with Google.';
            return isApiRequest
                ? res.status(400).json({ success: false, message })
                : res.redirect('/forgot-password?error=google_user');
        }
        
        const otp = generateOtp();
        console.log("Generated reset OTP:", otp);
        
        const emailSent = await sendResetPasswordEmail(email, otp, user.name);
        
        if (!emailSent) {
            const message = 'Failed to send email. Please try again.';
            return isApiRequest
                ? res.status(500).json({ success: false, message })
                : res.render('user/forgot-password', { message }); // FIXED: Added user/ path
        }
        
        req.session.resetOtp = otp;
        req.session.resetOtpExpires = new Date(Date.now() + 10 * 60 * 1000);
        req.session.resetUserId = user._id;
        
        console.log("Reset OTP sent successfully, stored in session");
        
        if (isApiRequest) {
            return res.json({ 
                success: true, 
                message: 'Password reset code sent successfully!',
                redirectUrl: '/forgot-password-otp'
            });
        }
        
        res.redirect('/forgot-password-otp');
        
    } catch (error) {
        console.error('Send forgot password OTP error:', error);
        const message = 'An error occurred. Please try again.';
        return req.headers.accept?.includes('application/json')
            ? res.status(500).json({ success: false, message })
            : res.render('user/forgot-password', { message }); // FIXED: Added user/ path
    }
};

const loadForgotPasswordOtp = async (req, res) => {
    try {
        if (!req.session.resetUserId || !req.session.resetOtp) {
            return res.redirect('/forgot-password');
        }
        
        const user = await User.findById(req.session.resetUserId);
        if (!user) {
            return res.redirect('/forgot-password');
        }
        
        // Check if user is blocked during password reset process
        if (user.isBlocked) {
            req.session.destroy();
            return res.redirect('/forgot-password?error=account_blocked');
        }
        
        const error = req.query.error;
        let message = null;
        
        if (error === 'invalid_otp') {
            message = 'Invalid OTP. Please try again.';
        } else if (error === 'expired_otp') {
            message = 'OTP has expired. Please request a new one.';
        }
        
        res.render('user/forgot-password-otp', { email: user.email, message }); // FIXED: Added user/ path
    } catch (error) {
        console.error('Forgot password OTP page loading error:', error);
        res.redirect('/forgot-password');
    }
};

const verifyForgotPasswordOtp = async (req, res) => {
    try {
        const { otp } = req.body;
        
        if (!otp || otp.length !== 6) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid 6-digit OTP"
            });
        }
        
        if (!req.session.resetOtp || !req.session.resetUserId) {
            return res.status(400).json({
                success: false,
                message: "Session expired. Please start again"
            });
        }
        
        // Check if user is still not blocked
        const user = await User.findById(req.session.resetUserId);
        if (!user || user.isBlocked) {
            req.session.destroy();
            return res.status(403).json({
                success: false,
                message: "Account access denied. Please contact support."
            });
        }
        
        if (req.session.resetOtpExpires && req.session.resetOtpExpires < new Date()) {
            return res.status(400).json({
                success: false,
                message: "OTP has expired. Please request a new one"
            });
        }
        
        if (req.session.resetOtp !== otp) {
            return res.status(400).json({
                success: false,
                message: "Invalid OTP. Please try again"
            });
        }
        
        delete req.session.resetOtp;
        delete req.session.resetOtpExpires;
        
        console.log("Reset OTP verified successfully");
        
        res.json({ success: true, redirectUrl: "/reset-password" });
        
    } catch (error) {
        console.error('Verify forgot password OTP error:', error);
        res.status(500).json({
            success: false,
            message: "An error occurred during verification"
        });
    }
};

const resendForgotPasswordOtp = async (req, res) => {
    try {
        if (!req.session.resetUserId) {
            return res.status(400).json({
                success: false,
                message: "Session expired. Please start again"
            });
        }
        
        const user = await User.findById(req.session.resetUserId);
        if (!user) {
            return res.status(400).json({
                success: false,
                message: "User not found"
            });
        }
        
        // Check if user is blocked during resend
        if (user.isBlocked) {
            req.session.destroy();
            return res.status(403).json({
                success: false,
                message: "Account access denied. Please contact support."
            });
        }
        
        const newOtp = generateOtp();
        const emailSent = await sendResetPasswordEmail(user.email, newOtp, user.name);
        
        if (!emailSent) {
            return res.status(500).json({
                success: false,
                message: "Failed to send OTP email. Please try again"
            });
        }
        
        req.session.resetOtp = newOtp;
        req.session.resetOtpExpires = new Date(Date.now() + 10 * 60 * 1000);
        
        res.status(200).json({
            success: true,
            message: "New reset code sent successfully!"
        });
        
        console.log("New reset OTP sent:", newOtp);
        
    } catch (error) {
        console.error("Resend forgot password OTP error:", error);
        res.status(500).json({
            success: false,
            message: "Server error while resending OTP"
        });
    }
};

const loadResetPassword = async (req, res) => {
    try {
        if (!req.session.resetUserId) {
            return res.redirect('/forgot-password');
        }
        
        if (req.session.resetOtp) {
            return res.redirect('/forgot-password-otp');
        }
        
        // Check if user is blocked during password reset
        const user = await User.findById(req.session.resetUserId);
        if (!user || user.isBlocked) {
            req.session.destroy();
            return res.redirect('/forgot-password?error=account_blocked');
        }
        
        const error = req.query.error;
        let message = null;
        
        if (error === 'password_mismatch') {
            message = 'Passwords do not match. Please try again.';
        } else if (error === 'weak_password') {
            message = 'Password must be at least 8 characters long.';
        }
        
        res.render('user/reset-password', { message }); // FIXED: Added user/ path
    } catch (error) {
        console.error('Reset password page loading error:', error);
        res.redirect('/forgot-password');
    }
};

const resetPassword = async (req, res) => {
    try {
        const { password, confirmPassword } = req.body;
        const userId = req.session.resetUserId;
        
        const isApiRequest = req.headers.accept?.includes('application/json');
        
        if (!userId) {
            const message = 'Session expired. Please start again.';
            return isApiRequest
                ? res.status(400).json({ success: false, message })
                : res.redirect('/forgot-password');
        }
        
        if (req.session.resetOtp) {
            const message = 'Please verify your OTP first.';
            return isApiRequest
                ? res.status(400).json({ success: false, message })
                : res.redirect('/forgot-password-otp');
        }
        
        if (!password || !confirmPassword) {
            const message = 'Both password fields are required.';
            return isApiRequest
                ? res.status(400).json({ success: false, message })
                : res.redirect('/reset-password?error=password_required');
        }
        
        if (password !== confirmPassword) {
            const message = 'Passwords do not match.';
            return isApiRequest
                ? res.status(400).json({ success: false, message })
                : res.redirect('/reset-password?error=password_mismatch');
        }
        
        if (password.length < 8) {
            const message = 'Password must be at least 8 characters long.';
            return isApiRequest
                ? res.status(400).json({ success: false, message })
                : res.redirect('/reset-password?error=weak_password');
        }
        
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
            const message = 'Password must contain uppercase, lowercase, and number.';
            return isApiRequest
                ? res.status(400).json({ success: false, message })
                : res.redirect('/reset-password?error=weak_password');
        }
        
        const user = await User.findById(userId);
        if (!user) {
            const message = 'User not found.';
            return isApiRequest
                ? res.status(404).json({ success: false, message })
                : res.redirect('/forgot-password');
        }
        
        // Final check if user is blocked before password update
        if (user.isBlocked) {
            req.session.destroy();
            const message = 'Account access denied. Please contact support.';
            return isApiRequest
                ? res.status(403).json({ success: false, message })
                : res.redirect('/forgot-password?error=account_blocked');
        }
        
        const passwordHash = await securePassword(password);
        
        user.password = passwordHash;
        await user.save();
        
        delete req.session.resetUserId;
        delete req.session.resetOtp;
        delete req.session.resetOtpExpires;
        
        console.log("Password reset successful for user:", user.email);
        
        if (isApiRequest) {
            return res.json({ 
                success: true, 
                message: 'Password reset successful!',
                redirectUrl: '/login'
            });
        }
        
        res.render('user/login', { // FIXED: Added user/ path
            message: 'Password reset successful! Please login with your new password.' 
        });
        
    } catch (error) {
        console.error('Reset password error:', error);
        const message = 'An error occurred. Please try again.';
        return req.headers.accept?.includes('application/json')
            ? res.status(500).json({ success: false, message })
            : res.redirect('/reset-password');
    }
};

const logout = async (req, res) => {
    try {
        console.log("Logout attempt for user:", req.session.user);
        
        if (req.session) {
            req.session.destroy((err) => {
                if (err) {
                    console.error('Session destroy error:', err);
                    return res.redirect('/');
                }
                
                console.log("Session destroyed successfully");
                res.clearCookie('connect.sid');
                
                if (req.user) {
                    req.logout((logoutErr) => {
                        if (logoutErr) {
                            console.log("Passport logout error", logoutErr);
                        }
                        return res.redirect('/login');
                    });
                } else {
                    return res.redirect('/login');
                }
            });
        } else {
            res.redirect('/login');
        }
        
    } catch (error) {
        console.error("Logout error:", error);
        return res.redirect('/');
    }
};

// UPDATED GOOGLE AUTH CALLBACK WITH BLOCKED USER PREVENTION
const googleAuthCallback = async (req, res) => {
    try {
        console.log("Google auth callback called");
        console.log("Auth context from session:", req.session.authContext);
        console.log("req.user:", req.user);
        console.log("Passport auth info:", req.authInfo);
        
        const authContext = req.session.authContext || 'login';
        
        if (!req.user) {
            const authInfo = req.authInfo || {};
            console.log("Authentication failed with info:", authInfo);
            
            delete req.session.authContext;
            
            if (authInfo.message === 'blocked') {
                const redirectUrl = authContext === 'signup' ? '/signup' : '/login';
                return res.redirect(`${redirectUrl}?error=google_user_blocked`);
            }
            
            if (authInfo.message === 'google_user_exists' || authInfo.message === 'email_exists') {
                return res.redirect('/signup?error=google_user_exists');
            }
            
            if (authInfo.message === 'user_not_found') {
                return res.redirect('/login?error=user_not_found');
            }
            
            const redirectUrl = authContext === 'signup' ? '/signup' : '/login';
            return res.redirect(`${redirectUrl}?error=google_auth_failed`);
        }
        
        // CRITICAL: Final check if Google user is blocked
        if (req.user.isBlocked) {
            console.log("Google user is blocked - destroying session and redirecting");
            req.session.destroy();
            return res.redirect('/login?error=google_user_blocked');
        }
        
        req.session.user = req.user._id;
        delete req.session.authContext;
        
        console.log("Google user authenticated successfully:", req.user.email);
        res.redirect('/');
        
    } catch (error) {
        console.error('Google auth callback error:', error);
        delete req.session.authContext;
        res.redirect('/login?error=google_auth_failed');
    }
};

const googleAuthFailure = async (req, res) => {
    console.log("Google auth failed");
    
    const authContext = req.session.authContext || 'login';
    delete req.session.authContext;
    
    const redirectUrl = authContext === 'signup' ? '/signup' : '/login';
    res.redirect(`${redirectUrl}?error=google_auth_failed`);
};

const getActiveCategories = async (req, res) => {
    try {
        const categories = await Category.find({ 
            islisted: true, 
            isDeleted: false 
        }).sort({ createdAt: -1 });

        res.json({
            success: true,
            categories: categories
        });
        
    } catch (error) {
        console.error('Error loading categories:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load categories'
        });
    }
};

module.exports = {
    loadHomepage,
    pageNotFound,
    loadSignup,
    signup,
    loadVerifyOtp,
    verifyOtp,      
    resendOtp,   
    loadLogin,  
    login,
    loadForgotPassword,
    sendForgotPasswordOtp,
    loadForgotPasswordOtp,
    verifyForgotPasswordOtp,
    resendForgotPasswordOtp,
    loadResetPassword,
    resetPassword,
    logout,
    googleAuthCallback,
    googleAuthFailure,
    getActiveCategories
};
