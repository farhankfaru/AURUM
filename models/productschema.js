const mongoose = require("mongoose");
const { Schema } = mongoose;

const productSchema = new Schema(
  {
    status: {
      type: String,
      enum: ["available", "out_of_stock"],
      required: true,
    },
    description: {
      type: String,
      required: true
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
    },
    productoffer: {
      type: Number,
      default: 0,
    },
    offerType: {
      type: String,
      enum: ["percentage", "fixed"],
      default: "percentage"
    },
    productname: {
      type: String,
      required: true,
      trim: true,
      unique: true, // Add unique constraint
      index: true   // Add index for better performance
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
      type: [String],
      required: true
    },
    appliedoffer: {
      type: Number,
      default: 0,
    },
    variants: [
      {
        quantity: { type: Number, default: 0 },
        size: { 
          type: String,
          required: true
        },
        sku: { 
          type: String,
          required: true
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

// Create compound index for product name (case-insensitive)
productSchema.index({ productname: 1 }, { unique: true });

// Pre-save middleware to prevent duplicate product names (case-insensitive)
productSchema.pre('save', async function(next) {
  if (this.isNew || this.isModified('productname')) {
    const existingProduct = await this.constructor.findOne({
      productname: { $regex: new RegExp(`^${this.productname}$`, 'i') },
      _id: { $ne: this._id }
    });
    
    if (existingProduct) {
      const error = new Error('Product name already exists');
      error.code = 11000; // Duplicate key error code
      return next(error);
    }
  }
  next();
});

const Product = mongoose.model("Product", productSchema);

module.exports = Product;
