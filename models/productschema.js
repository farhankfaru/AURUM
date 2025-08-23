const mongoose =require("mongoose")
const {Schema}=mongoose

const productSchema = new Schema(
  {
    status: {
      type: String,
      enum: ["available", "out_of_stock"],
      required: true,
    },
    description: {
      type: String,
      required:true
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
    },
    productoffer: {
      type: Number,
      default: 0,
    },
   productname: {
      type: String,
      required: true,
      trim: true,
    },
    productID: {
      type: Schema.Types.ObjectId,
      ref: "Product",
    },
    regularprice: {
      type: Number,
      required: true,
    },
    image: {
        type:[String],
        required:true
    },
    appliedoffer: {
      type: Number,
      default: 0,
    },
    variants: [
      {
        quantity: { type: Number, default: 0 },
        size: { type: String,
          required:true
         },
        sku: { type: String ,
          required:true
        },
      },
    ],
    isblock: {
      type: Boolean,
      default: false,
    },
    saleprice: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const Product = mongoose.model("Product", productSchema);

module.exports = Product;
