const mongoose =require("mongoose")
const  {Schema}= mongoose
 
 const userSchema=new Schema({
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true,
        unique:true,

    },
    phone:{
        type:String,
        required:false,
        unique:true,
        sparse:true,
        default:null,
    },
    googleId:{
        type:String,
        unique:true,
        sparse:true,
        required:false

    },
    password:{
        type:String,
        required:false,
    },
    isBlocked:{
        type:Boolean,
        default:false
    },
    isAdmin:{
        type:Boolean,
        default:false
    },
   
    
    referalcode:{
        type:String
    }
 },{timestamps:true})

  


const User = mongoose.model("User", userSchema)

module.exports= User
