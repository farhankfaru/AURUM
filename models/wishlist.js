  
  const mongoose =require("mongoose")
  const {Schema}=mongoose


   const wishlistSchema=new Schema({
    userid:{
        type:Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    products:[
        {
            productId:{
                type:Schema.Types.ObjectId,
                 ref:"Product",
                 required:true
            },
            addedAt:{
                type:Date,
                default:Date.now
            }
        }
    ]
    

   })

    
    const Wishlist=mongoose.model("Wishlist",wishlistSchema)

     module.exports=Wishlist