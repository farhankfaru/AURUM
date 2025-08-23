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
        unique:false,
        sparse:true,
        default:null,
    },
    googleId:{
        type:String,
        unique:true,

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
    createdAt:{
        type:Date,
        default:Date.now
    },
    updatedAt:{
        type:Date,
        default:Date.now

    },
    referalcode:{
        type:string
    }
 })


const User = mongoose.model("User".UserSchema)

module.exports= User
