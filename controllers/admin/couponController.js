const Product = require("../../models/productModel");
const Category = require("../../models/CategoryModel");
const User = require('../../models/userModel');
const Order = require('../../models/orderModel')
const ProductOffer = require("../../models/productOfferModel");
const CategoryOffer = require("../../models/categoryOfferModel");
const Coupon = require("../../models/couponModel");

const getCouponManagement = async(req,res) => {
    try {
        const existingCoupons = await Coupon.find({})
        if(existingCoupons) {
            res.render('couponManagement',{existingCoupons});
        } else {
            res.render('couponManagement');
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "An error occurred"
        });
    }
}

const addCoupon = async(req,res) => {
    try {
        const {code,name,discount,maxDiscount,minPurchase,usageLimit,expiryDate} = req.body
        const existingCoupon = await Coupon.findOne({code:code});
        
        if(!existingCoupon) {
            const newCoupon = new Coupon({
                code:code,
                name:name,
                discountPrice:discount,
                maxDiscountAmount:maxDiscount,
                minPurchaseAmount:minPurchase,
                usageLimit:usageLimit,
                expireOn:expiryDate
            })
            await newCoupon.save()
            if(newCoupon) {
                res.status(200).json({success:true,message:"Coupon added successfully"})
            } else {
                res.status(201).json({success:false,message:"Coupon added Failed , Try again"})
            }
        } else {
            res.status(201).json({success:false,message:"This coupon name is Already Exiist,Please enter another name"})
        }
        
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "An error occurred while adding the Coupon"
        });
    }
}

const unlistCoupon = async(req,res) => {
    try {
        const couponId = req.body.couponId;
        const existingCoupon = await Coupon.findOne({_id:couponId})

        if(existingCoupon) {
            await Coupon.updateOne(
                {_id:couponId},
                {isList:false}
            )
            req.session.coupon = false
            res.status(200).json({success:true,message:"This coupon is unlisted"})
        } else {
            res.status(201).json({success:false,message:"Coupon ulisted is Error occured,please Try again"})
        }
        
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "An error occurred while adding the Coupon"
        });
    }
}

const listCoupon = async(req,res) => {
    try {
        const couponId = req.body.couponId;
        const existingCoupon = await Coupon.findOne({_id:couponId})

        if(existingCoupon) {
            await Coupon.updateOne(
                {_id:couponId},
                {isList:true}
            )
            res.status(200).json({success:true,message:"This coupon is listed"})
        } else {
            res.status(201).json({success:false,message:"Coupon listed is Error occured,please Try again"})
        }
    
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "An error occurred while adding the Coupon"
        });
    }
}

const deleteCoupon = async(req,res) => {
    try {
        const couponId = req.body.couponId;
        const existingCoupon = await Coupon.findOne({_id:couponId})

        if(existingCoupon) {
            await Coupon.deleteOne({_id:couponId})
            req.session.coupon = false
            res.status(200).json({success:true,message:"This Coupon is Removed"})
        } else {
            res.status(201).json({success:false,message:"Coupon deleted is Error occured,please Try again"})
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "An error occurred while adding the Coupon"
        });
    }
}

module.exports = {
    getCouponManagement,
    addCoupon,
    unlistCoupon,
    listCoupon,
    deleteCoupon
}