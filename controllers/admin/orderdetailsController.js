const Product = require("../../models/productModel");
const Category = require("../../models/CategoryModel");
const User = require('../../models/userModel');
const Order = require('../../models/orderModel')
const Wallet = require('../../models/walletModel')


const getOrderList = async (req, res) => {
    try {
        const { page = 1, limit = 8, status } = req.query;

        const query = {};
        if (status && status !== 'Show all') {
            query.status = status;
        }

        const totalOrders = await Order.countDocuments(query);

        const orderList = await Order.find(query)
            .sort({ createdOn: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit))
            .populate("orderedItems")
            .populate("address")
            .populate("orderedItems.productId");

        const totalPages = Math.ceil(totalOrders / limit);

        res.render("order-list", {
            orderList,
            currentPage: Number(page),
            totalPages,
            status: status || "Show all",
        });
    } catch (error) {
        res.status(500).send("Internal Server Error");
    }
};


const getOrderDetails = async(req,res) => {
    try {
        const id = req.query.id

        const orderDetails = await Order.findOne({_id:id}).populate("orderedItems").populate("address").populate("orderedItems.productId")

        if(orderDetails) {
          res.render("order-details",{orderDetails})
        } else {
            res.redirect("/admin/page-error")
        }
    } catch (error) {
        res.status(500).send("Internal Server Error");
    }
}

const updateStatus = async (req,res) => {
    try {
        const {orderId , status} = req.body

        const orderDetails = await Order.findOne({_id:orderId})
        
        if(orderId && status && orderDetails.cancelled !== true) {
            await Order.updateOne(
                {_id:orderId},
                {status:status}
            )
              res.status(200).json({success:true});
        } else {
            res.status(201).json({success:false});
        }
    } catch (error) {
        res.status(500).send("Internal Server Error");
    }
}

const cancellOrder = async(req,res) => {
    try {
        const id = req.body.orderId

        const orderDetails = await Order.findOne({_id:id})
        const status = orderDetails.status
        
        if(orderDetails && status != 'Shipped') {
            await Order.updateOne(
                {_id:id},
                {cancelled:true,status:"Cancelled"}
            )
            const productId = orderDetails.orderedItems.map((item) => item)
        for(let item of productId) {
            await Product.updateMany(
                {_id:item.productId},
                {$inc: {quantity:item.quantity}}
            )
        }

            res.status(200).json({success:true,message:"Order Cancelled Successfully"})
        } else {
            res.status(201).json({success:false,message:"Order is Already Shipped"})
        }
    } catch (error) {
        res.status(500).json({success:false,error})
    }
}

const approveReturn = async (req,res) => {
    try {
        const orderId = req.body.orderId
        const existingOrder = await Order.findOne({_id:orderId})
        const existingUserWallet = await Wallet.findOne({userId:existingOrder.userId})
        
        if(existingOrder) {
                await Order.updateOne(
                    {_id:orderId},
                    {returned:true,status:"Return Request Approved"}
                )    
                const productId = existingOrder.orderedItems.map((item) => item)
                for(let item of productId) {
                    await Product.updateMany(
                        {_id:item.productId},
                        {$inc: {quantity:item.quantity}}
                    )
                }
                if(existingUserWallet) {
                    const newBalance = Number(existingUserWallet.balance) + Number(existingOrder.finalAmount)
                    await Wallet.updateOne(
                        {userId:existingOrder.userId},
                        {
                            $set: { balance: newBalance },
                            $push: {
                                transactions: {
                                    tranctransactionDate: Date.now(),
                                    transactionType: "Credit",
                                    transactionStatus: "Completed",
                                    amount: existingOrder.finalAmount
                                }
                            }
                        }
                    )
                } else {
                    const newWallet = new Wallet({
                        userId:existingOrder.userId,
                        balance:finalAmount,
                        transactions:[{
                            tranctransactionDate: Date.now(),
                            transactionType:"Credit",
                            transactionStatus:"Completed",
                            amount:finalAmount
                        }]
                    })
                    await newWallet.save()
                }
                res.status(200).json({success:true,message:"Order Returned Successfully And Amount returned To User Wallet"})
        }   else {
            res.status(201).json({success:false,message:"Order Returned Failed Order Not Found"})
        }
    } catch (error) {
        res.status(500).json({success:false,error})
    }
}

const rejectReturn = async (req,res) => {
    try {
        const orderId = req.body.orderId
        const existingOrder = await Order.findOne({_id:orderId})

        if(existingOrder) {
            await Order.updateOne(
                {_id:orderId},
                {status:"Return Request Rejected"}
            )
            res.status(200).json({success:true,message:"Order Returned Rejected"})
        } else {
            res.status(201).json({success:false,message:"Order Returned Failed Order Not Found"})
        }

    } catch (error) {
        res.status(500).json({success:false,error})
    }
}

module.exports = {
    getOrderList,
    getOrderDetails,
    updateStatus,
    cancellOrder,
    approveReturn,
    rejectReturn
}