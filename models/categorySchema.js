const mongoose = require("mongoose");
const { Schema } = mongoose;

const categorySchema = new Schema({
    categoryname: {
        type: String,
        required: true,
        unique: true
    },
    description: {
        type: String,
        required: true
    },
    islisted: {
        type: Boolean,
        default: true
    },
    categoryoffer: {
        type: Number,
        default: 0,
        min: 0
    },
    discountType: {
        type: String,
        enum: ['percentage', 'fixed'],
        default: 'percentage'
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

const Category = mongoose.model("Category", categorySchema);

module.exports = Category;
