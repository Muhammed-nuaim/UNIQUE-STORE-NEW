const User = require("../../models/userModel");
const Product = require("../../models/productModel");
const Category = require("../../models/CategoryModel");
const Address = require("../../models/addressModel");
const Cart =require("../../models/cartModel");
const Order = require("../../models/orderModel")
const Coupon = require("../../models/couponModel");
const { payment } = require("paypal-rest-sdk");


const loadCheckout = async(req,res) => {
    try {
        const user = req.session.user;
        const couponApply = req.session.coupon ? req.session.coupon : false
        const currentDate = new Date()
        const existingUser = await User.findOne({_id:user.id})
        const cart = await Cart.findOne({userId:existingUser._id}).populate('items.productId')
        const address = await Address.findOne({userId:existingUser._id})
        const existingCoupon = await Coupon.find({isList:true,$expr:{$gt:["$expireOn",currentDate]}}).populate("usage.userId").populate("usage")
        const existingCouponUser = await Coupon.findOne({code:couponApply.code,"usage.userId":existingUser._id}).populate("usage.userId")
    
        if( existingUser) {
            if(cart) {
            if(cart.items.length > 0) {
                if(cart.subTotal > 10000) {
                res.render('checkoutPage', {user , cart ,deliveryCharge:0, cartData: cart.items ,existingCouponUser:existingCouponUser?existingCouponUser:false, addressData:address ?address.addresses : 0 , couponApply ,existingCoupon: existingCoupon ? existingCoupon : null})
                } else {
                res.render('checkoutPage', {user , cart ,deliveryCharge:40, cartData: cart.items ,existingCouponUser:existingCouponUser?existingCouponUser:false, addressData:address ?address.addresses : 0 , couponApply ,existingCoupon: existingCoupon ? existingCoupon : null})
                }
            } else {
            req.flash('error', 'Your cart is empty. Add products to continue.');
            res.redirect('/cartPage');
            }
        }  else {
            req.flash('error', 'Your cart is empty. Add products to continue.');
            res.redirect('/cartPage');
        }
        }else {
            res.redirect('/pageNotFound');
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({success:false,message:"An error occured. Please try again"});
    }
}

const saveOrder = async (req,res) => {
    try {
        const user = req.session.user;
        const couponApply = req.session.coupon ? req.session.coupon : false
        const orderData = req.session.order && req.body.paymentMethod != 'Cash on Delivery' ? req.session.order : false;
        const {addressId , paymentMethod ,paymentStatus, orderId} = orderData ? orderData : req.body
        
        const existingUser = await User.findOne({_id:user.id});
        const existingOrder = await Order.findOne({_id:orderId})
        if(!existingOrder) {
        const address = await Address.findOne({"addresses._id":addressId})
        
        const cart = await Cart.findOne({userId:existingUser}).populate("items.productId")
        
        const cartItems = cart.items.map( item => {
            if(item.productId,item.Quantity > 0) {
                return {
                    productId:item.productId,
                    productImage:item.productId.productImage[0],
                    productName:item.productId.productName,
                    quantity:item.Quantity,
                    offerPrice:((item.productId.regularPrice - item.productId.salePrice)*item.Quantity),
                    price:item.price,
                    totalPrice:item.totalPrice,
                }
            }
        } )
        
        const offerDiscount = cartItems.reduce((sum, item) => sum + item.offerPrice, 0);
        
        if(existingUser && address && cart && cartItems.length > 0) {
            const addressData = address.addresses.find(id => id._id == addressId);
            
            if(addressData && paymentMethod ) {
                if(paymentMethod == "Cash on Delivery"){
                    if(cart.subTotal >= 10000) {                   
                       return res.status(201).json({success:false,message:"Cash on Delivery: Only Available in maximum order of 10000"});
                    }
                     
                }
                for (const item of cartItems) {
                    await Product.updateOne(
                        { _id: item.productId },
                        { $inc: { quantity: -item.quantity } }
                    );
                }
                const addToOrder = new Order({
                    userId: existingUser._id,
                    finalAmount: cart.subTotal < 10000 ? cart.subTotal+40 : cart.subTotal,
                    paymentMethod: paymentMethod,
                    paymentStatus: paymentStatus,
                    orderedItems: cartItems ,
                    deliveryCharge : cart.subTotal < 10000 ? 40 : 0,
                    offerDiscount: offerDiscount,
                    couponDiscount: couponApply ? couponApply.discountPrice : 0,
                    totalDiscount: offerDiscount + Number((couponApply ? couponApply.discountPrice : 0)),
                    couponApplied: couponApply ? true : false,
                    couponCode : couponApply ? couponApply.couponCode : false,
                    address: [{
                        addressId:addressId,
                        addressType:addressData.addressType,
                        name:addressData.name,
                        city:addressData.city,
                        landMark:addressData.landMark,
                        state:addressData.state,
                        pincode:addressData.pincode,
                        phone:addressData.phone,
                        altPhone:addressData.altPhone,
                    }]
                })
                
                await addToOrder.save();                
                orderData ? res.redirect('/order-success') : res.status(200).json({success:true}) 
            } else {
                res.status(201).json({success:false,message:"invalid address , Please choose another address"})
        }
        } else if (!cartItems.length > 0) {
            req.flash('error', 'Your cart is empty. Add products to continue.');
            res.redirect('/cartPage');
        } else {
            req.flash('error', 'Invalid User.');
            res.redirect('/cartPage');
        }
    } else {
        await Order.updateOne ({_id:orderId},{paymentStatus:paymentStatus})
        res.redirect('/order-success')
    }
        
    } catch (error) {
        console.log(error);
        res.status(500).json({success:false,message:"An error occured. Please try again"});
    }
}

const orderSuccess = async(req,res) => {
    try {
        const user = req.session.user;
        const couponApply = req.session.coupon ? req.session.coupon : false
        const existingUser = await User.findOne({_id:user.id})
        const order = await Order.findOne({userId:existingUser._id}).sort({createdOn: -1 }).populate("orderedItems.productId","address")
        const cart = await Cart.findOne({userId:existingUser._id});

        if(cart) {
            await Cart.deleteOne({userId:existingUser._id})
            if(order && existingUser) {
                req.session.coupon = false
                req.session.order = false               
                res.render('order-success',{user ,couponApply,orderData: order})
            }
        } else {
            if(order && existingUser) {
                req.session.coupon = false
                req.session.order = false               
                res.render('order-success',{user ,couponApply,orderData: order})
            }
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({success:false,message:"An error occured. Please try again"});
    }
}


module.exports = {
    loadCheckout,
    saveOrder,
    orderSuccess,
}