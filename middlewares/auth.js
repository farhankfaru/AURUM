const User =require("../models/userSchema")



 const userAuth= (req,res,next)=>{
    if(req.session.User){
        User.findById(req.session.User)
        .then(data=>{
            if (data && !data.isBlocked){
                next()
            }else{
                res.redirect('/login')
            }


        })
        .catch(error=>{
            console.log("errror in user auth middlwear")
            res.status(500).send("internal server errror")
        })
    } 
    else{
        res.redirect('/login')
    }
 }

const adminAuth = (req, res, next) => {
    User.findOne({isAdmin:true})
    .then(data=>{
        if (data) {
        console.log("Admin authenticated:", req.session.admin);
        next();
    } else {
        console.log("Admin not authenticated, redirecting to login");
        res.redirect('/admin/login');
    }

    })
    .catch(error=>{
        console.log('error in adminauth middleware',error)
        res.status(500).send('internal server error')

    })
    
};




 module.exports={
    userAuth,
    adminAuth,
    
 }