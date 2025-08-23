const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");
const { Schema } = mongoose;

const orderSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: [
      {
        productId: {
          type: Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        price: {
          type: Number,
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        size: {
          type: String,
          default: null,
        },
        sku: {
          type: String,
          default: null,
        },
        itemStatus: {
          type: String,
          enum: ["pending", "shipped", "delivered", "cancelled", "returned"],
          default: "pending",
        },
        itemReturnStatus: {
          type: String,
          enum: ["requested", "approved", "rejected", "completed"],
          default: null,
        },
        returnReason: {
          type: String,
          default: null,
        },
      },
    ],
    address: {
      name: { type: String, required: true },
      phoneNo: { type: String, required: true },
      altPhoneNo: { type: String, default: null },
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      country: { type: String, required: true },
      pincode: { type: Number, required: true },
    },
    orderStatus: {
      type: String,
      enum: ["pending", "confirmed", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
    orderReturnStatus: {
      type: String,
      enum: ["requested", "processing", "completed", "rejected"],
      default: null,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    deliveryCharge: {
      type: Number,
      default: 0,
    },
    couponApplied: {
      type: Boolean,
      default: false,
    },
    coupon: {
      type: Schema.Types.ObjectId,
      ref: "Coupon",
      default: null,
    },
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: "Payment",
      default: null,
    },
    orderId: {
      type: String,
      default: () => uuidv4(),
      unique: true,
      required: true,
    },
    invoiceDate: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;
