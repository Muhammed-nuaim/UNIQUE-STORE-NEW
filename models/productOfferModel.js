const mongoose = require("mongoose");
const {Schema} = mongoose;

const productOfferSchema = new Schema ({
    offerName:{
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
    offerPrice: {
        type: Number,
        required: true
    },
    productId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true
    }
},{timestamps:true})

productOfferSchema.index({ expireOn: 1 }, { expireAfterSeconds: 0 });

const productOffer = mongoose.model("productOffer",productOfferSchema)

module.exports = productOffer;