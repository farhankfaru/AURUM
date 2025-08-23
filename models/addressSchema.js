
 const mongoose=require("mongoose")
 const {Schema}= mongoose


 const addressSchema=new Schema({

     userId:{
        type:Schema.Types.ObjectId,
        ref:"User",
        required:true
     },
      address:[{
        name:{
            type:String,
            required:true
        },
        country:{
            type:String,
            required:true
        },
        state:{
            type:String,
            required:true,
        },
        city:{
            type:String,
            required:true
        },
        street:{
            type:String,
            required:true
        },
        pincode:{
            type:Number,
            required:true
        },
        phonenumber:{
            type:String,
            required:true
        },
        altphonenumber:{
            type:String,
            required:true
        }
      }]

 })

 const Address= mongoose.model("Address",addressSchema)

 module.ecxports= Address
  
