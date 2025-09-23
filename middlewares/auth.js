const User = require("../models/userSchema");

const userAuth = (req, res, next) => {
    if (req.session.user) {
        const timeout = setTimeout(() => {
            console.log("User auth database timeout");
            req.session.destroy();
            res.redirect('/login');
        }, 3000);

        User.findById(req.session.user)
            .then(data => {
                clearTimeout(timeout);
                if (data && !data.isBlocked) {
                    next();
                } else {
                    req.session.destroy();
                    res.redirect('/login');
                }
            })
            .catch(error => {
                clearTimeout(timeout);
                console.log("Error in user auth middleware:", error);
                req.session.destroy();
                res.redirect('/login');
            });
    } else {
        res.redirect('/login');
    }
};

const adminAuth = (req, res, next) => {
    if (req.session.admin) {
        console.log("Admin authenticated:", req.session.admin);
        next();
    } else {
        console.log("Admin not authenticated, redirecting to login");
        res.redirect('/admin/login');
    }
};

module.exports = {
    userAuth,
    adminAuth
};
