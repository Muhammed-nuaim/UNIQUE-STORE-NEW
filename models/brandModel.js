const Mongoose = required("mongoose")
const {Schema} = mongoose;

const brandSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    brandImage: {
        type: [image],
        required: true
    },
    isBlocked : {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
})

const Brand = mongoose.model("Brand",brandSchema)

module.exports = Brand;