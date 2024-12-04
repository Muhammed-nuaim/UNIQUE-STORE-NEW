const Product = require("../../models/productModel");
const Category = require("../../models/CategoryModel");
const User = require('../../models/userModel');
const Order = require('../../models/orderModel')
const ProductOffer = require("../../models/productOfferModel");
const CategoryOffer = require("../../models/categoryOfferModel");

const getProductOffer = async(req,res) => {
    try {
        const existingProducts = await Product.find({isBlocked:false});
        const productOffer = await ProductOffer.find({}).populate("productId")

        if(productOffer) {
            res.render("product-offer",{existingProducts,productOffer})
        } else {
            res.render("product-offer",{existingProducts})
        }

    } catch (error) {
        res.redirect("/admin/page-error")
    }
}

const getCategoryOffer = async(req,res) => {
    try {
        const existingCategory = await Category.find({isListed:true});
        const categoryOffer = await CategoryOffer.find({}).populate("categoryId")

        if(categoryOffer) {
            res.render("category-offer",{existingCategory,categoryOffer})
        } else {
            res.render("category-offer",{existingCategory})
        }

    } catch (error) {
        res.redirect("/admin/page-error")
    }
}

const addProductOffer = async (req,res) => {
    try {        
        const {name,value,date,offerType,selectedProductId} = req.body
        const existingProduct = await Product.findOne({_id:selectedProductId})
        const existingProductOffer = await ProductOffer.findOne({productId:selectedProductId})
        let offerPrice = 0;
        console.log(existingProductOffer);
        
        
        if(offerType == "Percentage") {

            offerPrice = existingProduct.regularPrice - ((existingProduct.regularPrice) * (value/100))
        } else {

            offerPrice = existingProduct.regularPrice - value
        }
        console.log(existingProduct,offerPrice,existingProduct.salePrice,offerPrice,existingProductOffer);
        

        if(existingProduct && offerPrice && existingProduct.regularPrice > offerPrice && !existingProductOffer){

            const newOfferUpdated = new ProductOffer({
                offerName:name,
                offerPrice:offerPrice,
                expireOn:date,
                productId:selectedProductId,
            })
            await newOfferUpdated.save()

            if(newOfferUpdated) {
                await Product.updateOne({
                    _id:selectedProductId,isBlocked:false
                },{salePrice:newOfferUpdated.offerPrice,productOffer:newOfferUpdated.offerPrice})
            }

            return res.status(200).json({
                success: true,
                message: "Product offer added successfully"
            });
        } else {
            console.log("1");
            
            return res.status(201).json({
                success: false,
                message: "This Product has Already an Offer"
            });
        }
        
    } catch (error) {
        console.error(error);
    }
}


const deleteProductOffer = async (req,res) => {
    try {
        const id = req.body.id        
        const existingProductOffer = await ProductOffer.findOne({_id:id}).populate('productId')
        const existingCategoryOffer = await CategoryOffer.findOne({categoryId:existingProductOffer.productId.category})
        const existingCategoryProduct = await Product.findOne({category:existingProductOffer.productId.category})
        const existingProduct = await Product.findOne({_id:existingProductOffer.productId})
        let newPrice = 0;
        
        console.log(existingCategoryOffer,existingCategoryProduct);
        
        if(existingProductOffer) {
            if( existingCategoryOffer && existingCategoryProduct) {
                
                        const offerPrice = existingCategoryProduct.regularPrice - (existingCategoryProduct.regularPrice * (existingCategoryOffer.offerPrice/100));
                        console.log(offerPrice);

                        await Product.updateOne(
                            { _id: existingCategoryProduct._id, category: existingCategoryOffer.categoryId, isBlocked: false },
                            { salePrice: Math.round(offerPrice * 100) / 100 }
                        );
                        await ProductOffer.deleteOne(
                            {_id:id}
                        )
                        res.status(200).json({success:true,message:"ProductOffer removed Succesfully"})
                    } else {
                        // newPrice = existingProduct.regularPrice - (existingProduct.regularPrice * (5/100))
                        newPrice = existingProduct.regularPrice 

                        await Product.updateOne(
                            {_id:existingProduct._id},
                            {salePrice:newPrice}
                        )
                        await ProductOffer.deleteOne(
                            {_id:id}
                        )
                        res.status(200).json({success:true,message:"ProductOffer removed Succesfully"})
                    }
                } else {
                    res.staus(201).json({success:false,message:"Product deleted has same error occured"})
                }
            } catch (error) {
                res.status(500)
                console.error(error)
            }
        }


const addCategoryOffer = async (req,res) => {
    try {        
        const {name, value, date, offerType, selectedCategoryId} = req.body;
        
        const existingProduct = await Product.find({category: selectedCategoryId});
        const existingCategoryOffer = await CategoryOffer.findOne({categoryId:selectedCategoryId});
        
        if (!existingProduct || existingProduct.length === 0) { 
            return res.status(200).json({
                success: false,
                message: "This Category has no Products"
            });
        }

        if (offerType === "Percentage" && !existingCategoryOffer) {
            const newOfferUpdated = new CategoryOffer({
                offerName: name,
                offerPrice: value,
                expireOn: date,
                categoryId: selectedCategoryId,
            });
            await newOfferUpdated.save();

            for (let item of existingProduct) {
                const offerPrice = item.regularPrice - (item.regularPrice * (value/100));
                if(item.salePrice > Math.round(offerPrice * 100) / 100) {
                await Product.updateOne(
                    { _id: item._id, category: selectedCategoryId, isBlocked: false },
                    { salePrice: Math.round(offerPrice * 100) / 100 }
                );
            }
        }

            return res.status(200).json({
                success: true,
                message: "Category offer added successfully"
            });
        } 

        return res.status(200).json({
            success: false,
            message: "This Category has already in a offer"
        });
        
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "An error occurred while adding the offer"
        });
    }
};
 

const deleteCategoryOffer = async (req, res) => {
    try {
        const id = req.body.id        
        const existingCategoryOffer = await CategoryOffer.findOne({_id: id})
        let newPrice = 0;
        
        if (!existingCategoryOffer) {
            return res.status(201).json({
                success: false, 
                message: "This CategoryOffer is not Found, Please try again"
            });
        }

        const existingProducts = await Product.find({category: existingCategoryOffer.categoryId});
        
        if (!existingProducts || existingProducts.length === 0) {
            return res.status(201).json({
                success: false, 
                message: "This category is not Found, Please try again"
            });
        }

        for (let item of existingProducts) {
            newPrice = item.regularPrice - (item.regularPrice * (5/100));
            const existingProductOffer = await ProductOffer.findOne({productId:item._id})
            console.log(existingProductOffer);
            
            if(existingProductOffer) {
                await Product.updateOne(
                    {_id:item._id},
                    {salePrice:existingProductOffer.offerPrice }
                )
            } else {
                await Product.updateOne(
                    {_id: item._id},
                    {salePrice: newPrice}
                );
            }
        }

        await CategoryOffer.deleteOne({_id: id});

        return res.status(200).json({
            success: true,
            message: "CategoryOffer removed Successfully"
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "An error occurred while adding the offer"
        });
    }
}

module.exports = {
    getProductOffer,
    getCategoryOffer,
    addProductOffer,
    deleteProductOffer,
    addCategoryOffer,
    deleteCategoryOffer
}