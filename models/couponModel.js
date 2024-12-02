const mongoose = require("mongoose");
const {Schema} = mongoose;

const couponSchema = new Schema ({
    code:{
        type:String,
        required: true,
        unique: true
    },
    name:{
        type: String,
        required: true,
    },
    createdOn : {
        type: Date,
        default: Date.now,
        required: true
    },
    expireOn: {
        type: Date,
        required: true
    },
    discountPrice: {
        type: Number,
        required: true
    },
    maxDiscountAmount: {
        type: Number,
        required: true
    },
    minPurchaseAmount: {
        type: Number,
        required: true
    },
    usageLimit: {
        type: Number,
        required: true
    },
    isList: {
        type: Boolean,
        default: true
    },
    usage:[{
        userId:{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        usageLimit: {
            type:Number,
            default:0
        }
    }]
},{timestamps:true})

couponSchema.index({expireOn: 1 },{expireAfterSeconds: 0})

const Coupon = mongoose.model("Coupon",couponSchema)

module.exports = Coupon;