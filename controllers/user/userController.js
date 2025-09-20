const User = require("../../models/userSchema");
const nodemailer = require("nodemailer");
const env = require("dotenv").config();
const bcrypt = require("bcrypt");

const pageNotFound = async (req, res) => {
    try {
        res.render("page-404");
    } catch (error) {
        res.redirect("/pageNotFound");
    }
};

const loadSignup = async (req, res) => {
    try {
        return res.render("signup");  
    } catch (error) {
        console.log('Signup page not loading:', error);
        res.status(500).send("Server Error");
    }
};

function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}


async function sendVarificationEmail(email, otp) {
    try {
        console.log(" Attempting to send email to:", email);
        console.log(" Email config:", {
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
        console.log(" Email transporter verified");
        
        const info = await transporter.sendMail({
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "Verify your AURUM account",
            text: `Your OTP for AURUM verification is ${otp}`,
            html: `
                <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #8B7355; font-size: 2.5rem; letter-spacing: 0.2em;">AURUM</h1>
                        <p style="color: #6B5B47; font-style: italic;">Timeless elegance, exclusive fashion</p>
                    </div>
                    <div style="background: #F5F5DC; padding: 20px; border-radius: 10px; text-align: center;">
                        <h2 style="color: #8B7355; margin-bottom: 10px;">Verify Your Account</h2>
                        <p style="color: #6B5B47; margin-bottom: 20px;">Enter this verification code to complete your registration:</p>
                        <div style="font-size: 2rem; font-weight: bold; color: #8B7355; letter-spacing: 0.5em; margin: 20px 0;">${otp}</div>
                        <p style="color: #666; font-size: 0.9rem;">This code will expire in 10 minutes.</p>
                    </div>
                </div>
            `,
        });
        
        console.log(" Email sent successfully:", info.messageId);
        return info.accepted.length > 0;
        
    } catch (error) {
        console.error(" Email sending error:", error.message);
        console.error("Full error:", error);
        return false;
    }
}


const signup = async (req, res) => {
    try {
        console.log(" Signup attempt with data:", req.body);

        const { name, email, phone, password, confirmPassword } = req.body;
        
        
        if (!name || !email || !phone || !password || !confirmPassword) {
            return res.render("signup", { message: "All fields are required" });
        }
        
        if (password !== confirmPassword) {
            return res.render("signup", { message: "Passwords do not match" });
        }
        
        const findUser = await User.findOne({ email: email.toLowerCase() });
        if (findUser) {
            return res.render("signup", { message: "User with this email already exists" });
        }
        
       
        const otp = generateOtp();
        console.log(" Generated OTP:", otp);
        
        const emailSent = await sendVarificationEmail(email, otp);

        if (!emailSent) {
            console.log(" Email sending failed");
            return res.render("signup", { message: "Failed to send verification email. Please check your email address and try again." });
        }
        
        
        req.session.userOtp = otp;
        req.session.userData = { name, email: email.toLowerCase(), phone, password };
        
        console.log(" OTP sent successfully, redirecting to verify-otp");
        res.render("verify-otp", { email: email });

    } catch (error) {
        console.error(" Signup error:", error);
        res.render("signup", { message: "An error occurred during signup. Please try again." });
    }
};

const securepassword = async (password) => {
    try {
        const passwordHash = await bcrypt.hash(password, 10);
        return passwordHash;
    } catch(error) {
        console.error("Password hashing error:", error);
        throw error;
    }
};


const verifyOtp = async (req, res) => {
    try {
        const { otp } = req.body;
        
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
        
        if (!req.session.userOtp) {
            return res.status(400).json({
                success: false,
                message: "OTP session expired. Please request a new OTP"
            });
        }
        
        if (otp === req.session.userOtp) {
            const user = req.session.userData;
            const passwordHash = await securepassword(user.password);
            
            console.log(" Creating user with password hash:", passwordHash ? "YES" : "NO");
            
            const saveUserData = new User({
                name: user.name,
                email: user.email,
                phone: user.phone,
                password: passwordHash, 
                isBlocked: false,
                isAdmin: 0
            });
            
            await saveUserData.save();
            console.log("User saved with password:", saveUserData.password ? "YES" : "NO");
            
            req.session.user = saveUserData._id;
            
            delete req.session.userOtp;
            delete req.session.userData;
            
            res.json({success: true, redirectUrl: "/"});
        } else {
            res.status(400).json({success: false, message: "Invalid OTP. Please try again"});  
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
        if (!req.session.userData) {
            return res.status(400).json({
                success: false,
                message: "Session expired. Please register again"
            });
        }
        
        const userData = req.session.userData;
        const newOtp = generateOtp();
        const emailSent = await sendVarificationEmail(userData.email, newOtp);
        
        if (!emailSent) {
            return res.status(500).json({
                success: false,
                message: "Failed to send OTP email. Please try again"
            });
        }
        
        req.session.userOtp = newOtp;
        
        res.status(200).json({
            success: true,
            message: "New OTP sent successfully!"
        });
        
        console.log("New OTP sent:", newOtp);
        
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
        if (!req.session.user) {
            return res.render("login");
        } else {
            res.redirect('/');
        }
    } catch (error) {
        res.redirect('pageNotFound');
    }
};

const loadHomepage = async (req, res) => {
    try {
        const userId = req.session.user; 
        if (userId) {
            const userData = await User.findById(userId); 
            res.render('home', {user: userData});
        } else {
            return res.render('home', {user: null}); 
        }
    } catch (error) {
        console.log("Home page error:", error);
        res.status(500).send("Server Error");
    }
};



const login = async (req, res) => {
    try {
        console.log("=== LOGIN ATTEMPT START ===");
        console.log("Request body:", req.body);
        
        const { email, password } = req.body;
        
        if (!email || !password) {
            console.log(" Missing email or password");
            return res.render("login", { message: "Please provide both email and password" });
        }
        
        console.log(" Searching for user with email:", email);
        
        const findUser = await User.findOne({ email: email.toLowerCase().trim(), isAdmin: 0 });
        
        if (!findUser) {
            console.log(" User not found in database");
            return res.render("login", { message: "Invalid email or password" });
        }
        
        console.log(" User found:", findUser.email);
        console.log("   - isAdmin:", findUser.isAdmin);
        console.log("   - isBlocked:", findUser.isBlocked);
        console.log("   - Password exists:", findUser.password ? "YES" : "NO");
        
      
        if (!findUser.password) {
            console.log(" User has no password hash in database");
            return res.render("login", { message: "Account setup incomplete. Please contact support." });
        }
        
       
        if (findUser.isBlocked === true) {
            console.log(" User is blocked");
            return res.render("login", { message: "Your account has been blocked by admin" });
        }
        
        console.log(" Comparing passwords...");
        
        const passwordMatch = await bcrypt.compare(password, findUser.password);
        console.log(" Password match result:", passwordMatch);
        
        if (!passwordMatch) {
            console.log(" Password does not match");
            return res.render('login', { message: "Invalid email or password" });
        }
        
        
        console.log(" LOGIN SUCCESSFUL!");
        req.session.user = findUser._id;
        console.log(" Session set for user ID:", findUser._id);
        
        return res.redirect("/");
        
    } catch (error) {
        console.error(" LOGIN ERROR:", error);
        return res.render('login', { message: "Login failed, please try again later" });
    }
};


const logout = async (req, res) => {
    try {
        console.log(" Logout attempt for user:", req.session.user);
        
        req.session.destroy((err) => {
            if (err) {
                console.error('Session destroy error:', err);
                return res.redirect('/');
            }
            
            console.log(" Session destroyed successfully");
            
       
            res.clearCookie('connect.sid');
            
           
            return res.redirect('/');
        });
        
    } catch (error) {
        console.error(" Logout error:", error);
        return res.redirect('/');
    }
};



module.exports = {
    loadHomepage,
    pageNotFound,
    loadSignup,
    signup,
    verifyOtp,      
    resendOtp,   
    loadLogin,  
    login,
    logout,
};
