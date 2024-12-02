const mongoose = require('mongoose');
const {Schema} = mongoose;


const walletSchema = new mongoose.Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    balance: {
        type: Number,
        required: true,
        default: 0
    },
    transactions: [
        {
            orderId: {
                type: Schema.Types.ObjectId,
                ref: "Order",
                required: false
            },
            transactionDate: {
                type: Date,
                default: Date.now,
                required: true,
            },
            transactionType: {
                type: String,
                enum: ["Debit", "Credit","Deposit"],
                required: true,
            },
            transactionStatus: {
                type: String,
                enum: ["Pending", "Completed", "Failed"],
                default:"Completed",
                required: true,
            },
            amount: {
                type: Number,
                required: true,
            },
        }
    ]
})


const Wallet = mongoose.model("Wallet", walletSchema)
module.exports = Wallet;