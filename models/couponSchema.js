const mongoose = require("mongoose");
const { Schema } = mongoose;

const couponSchema = new Schema(
  {
    couponCode: {
      type: String,
      required: true,
      unique: true, // no duplicate coupon codes
      trim: true,
      uppercase: true,
    },
    couponName: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1, // must be greater than 0
    },
    minCartValue: {
      type: Number,
      default: 0, // minimum cart value to apply coupon
    },
    usageLimit: {
      type: Number,
      default: 1, // how many times the coupon can be used in total
    },
    expireDate: {
      type: Date,
      required: true,
    },
    usedBy: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    isBlocked: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true } // adds createdAt & updatedAt automatically
);

const Coupon = mongoose.model("Coupon", couponSchema);

module.exports = Coupon;
