const mongoose = require("mongoose");
const {Schema} = mongoose;

const categoryOfferSchema = new Schema ({
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
    categoryId:[{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
        required: true
    }]
})

const categoryOffer = mongoose.model("categoryOffer",categoryOfferSchema)

module.exports = categoryOffer;