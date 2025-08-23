const mongoose=require("mongoose")
const {Schema}=mongoose


 const cartSchema=new Schema({

     userid:{
        type:Schema.Types.ObjectId,
        ref:"User",
        required:true
     },
     products:[
        {
            productid:{
                type:Schema.Types.ObjectId,
                ref:"Product",
                required:true
            },
            price:{
                type:Number,
                required:true
            },
            quantity:{
                type:Number,
                default:1
            },
            size:{
                type:String,
                required:true,

            },
            sku:{
                type:String,
                required:true
            }

        }
     ]


 },{timestamps:true})

  const Cart=mongoose.model("Cart",cartSchema)

   module.exports=Cart