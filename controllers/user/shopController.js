const User = require("../../models/userModel")
const Product = require("../../models/productModel")
const Category = require("../../models/CategoryModel")
const Cart  = require("../../models/cartModel")
const whishlist = require("../../models/whishlistModel")

const getProductDetais = async (req,res) => {
    try {
    const id = req.query.id
    const user = req.session.user;

    const product = await Product.findOne({_id:id,isBlocked:false})
    const category = await Category.findOne({_id:product.category,isListed:true})
    const size = await Product.find({size:product.size,isBlocked:false})
    
    if(product) {
        if(user){
            const existingCart = await Cart.findOne({userId:user.id,"items.productId":id})
            const existingWhishlist = await whishlist.findOne({userId:user.id,productId:id})
            const verifyuser = await User.findOne({_id:user.id,isBlocked:false})
            if(verifyuser){
                res.render("product-detail",{ user , product , category , size ,existingCart: existingCart? true : false , existingWhishlist: existingWhishlist? true : false})
            }else {
                req.session.user = false
                res.render("product-detail",{ product , category , size ,existingCart: false , existingWhishlist: false})
            }
        } else {
            res.render("product-detail",{ product , category , size ,existingCart: false , existingWhishlist: false})
        }
    } else {
        res.render("page-404")
    }
    
    } catch (error) {
        res.render("page-404")
    }
}


const shoppingPage = async (req, res) => {
    try {
        const user = req.session.user;
        const page = parseInt(req.query.page) || 1;
        const limit = 8;
        const skip = (page - 1) * limit;

        const sortBy = req.query.sort || 'newest';
        const categoryBy = req.query.category || '';
        const sizeBy = req.query.size || '';
        const search = req.query.search || '';

        const Categories = await Category.find({ isListed: true });

        let query = { isBlocked: false };

        if (categoryBy) {
            query.category = categoryBy;
        } else {
            query.category = { $in: Categories.map(category => category._id) };
        }

        if (search) {
            query.productName = { $regex: new RegExp(search, "i") };
        }

        if (sizeBy && sizeBy !== '') {
            query.size = sizeBy;
        }

        let sortConfig = {};
        switch (sortBy) {
            case 'nameAsc':
                sortConfig.productName = 1;
                break;
            case 'nameDesc':
                sortConfig.productName = -1;
                break;
            case 'priceAsc':
                sortConfig.salePrice = 1;
                break;
            case 'priceDesc':
                sortConfig.salePrice = -1;
                break;
            case 'bestSeller':
                sortConfig.bestSeller = -1;
                break;
            case 'popularity':
                sortConfig.popularity = -1;
                break;
            default:
                sortConfig.createdOn = -1;
        }

        const totalProducts = await Product.countDocuments(query);

        const productData = await Product.find(query)
            .select('productName productImage regularPrice salePrice size createdOn')
            .sort(sortConfig)
            .skip(skip)
            .limit(limit);

        const totalPages = Math.ceil(totalProducts / limit);

        let wishlistProductIds = [];
        if (user) {
            const wishlist = await whishlist.findOne({ userId: user.id });
            wishlistProductIds = wishlist ? wishlist.productId.map(id => id.toString()) : [];
        }
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                        return res.json({
                            products: productData,
                            category: Categories,
                            currentPage: page,
                            totalPages: totalPages,
                            totalProducts: totalProducts,
                            selectedCategory: categoryBy,
                            selectedSize: sizeBy
                        });
                    }

        const renderData = {
            products: productData,
            category: Categories,
            currentPage: page,
            totalPages: totalPages,
            totalProducts: totalProducts,
            currentSort: sortBy,
            searchQuery: search,
            categoryBy: categoryBy,
            sizeBy: sizeBy,
            wishlistProductIds, 
        };

        if (user) {
            const verifyuser = await User.findOne({ _id: user.id, isBlocked: false });
            if (verifyuser) {
                renderData.user = user;
            } else {
                req.session.user = false;
            }
        }

        res.render("product", renderData);
    } catch (error) {
        console.error("Shopping page error:", error);
        res.status(500).json({
            success: false,
            message: "An error occurred while fetching products",
            error: error.message,
        });
    }
};


module.exports = {
    getProductDetais,
    shoppingPage
};