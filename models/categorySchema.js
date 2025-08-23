
 const mongoose=require("mongoose")
 const {Schema}=mongoose


  const categorySchema=new Schema({
    categoryname:{
        type:String,
        required:true,
        unique:true
    },
    description:{
        type:String,
        required: true
    },
    islisted:{
        type:Boolean,
        default:true

    },
    categoryoffer:{
        tyep:Number,
        default:0
    },
     



  },{timestamps:true})

    const Category =mongoose.model("Category",categorySchema)


     module.exports=Category