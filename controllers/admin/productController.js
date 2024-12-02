const Product = require("../../models/productModel");
const Category = require("../../models/CategoryModel");
const Cart = require("../../models/cartModel")
const Whishlist = require("../../models/whishlistModel")
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { log } = require("console");

// Load the page to add products
const getProductAddPage = async (req, res) => {
    try {
        const category = await Category.find({ isListed: true }); 
        res.render("product-add", {
            cat: category,
        });
    } catch (error) {
        console.error("Error loading add product page", error);
        res.redirect("/admin/page-error");
    }
};

const addProducts = async (req, res) => {
    try {
        const {productName,description,specification,regularPrice,salePrice,quantity,size,category}= req.body;

        const productExists = await Product.findOne({
            productName: productName,
        });


        if (!productExists) {
            const images = [];

            if (req.files && req.files.length > 0) {
                for (let i = 0; i < req.files.length; i++) {
                    const originalImagePath = req.files[i].path;

                    const resizedImagePath = path.join('public', 'uploads', 'product-images', req.files[i].filename);

                    await sharp(originalImagePath).resize({ width: 404, height: 440 }).toFile(resizedImagePath);
                    images.push(req.files[i].filename);
                }
            }

            const categoryId = await Category.findOne({ name: category });
            if (!categoryId) {
                return res.status(400).json({ error: "Invalid category name" });
            }

            const newProduct = new Product({
                productName: productName,
                description: description,
                specification: specification,
                category: categoryId._id,
                regularPrice: regularPrice,
                salePrice: salePrice,
                createdOn: new Date(),
                quantity: quantity,
                size: size,
                productImage: images,
                status: 'Available',
            });

            await newProduct.save();

            return res.redirect("/admin/addProducts");
        } else {
            return res.status(400).json({ error: "Product already exists, please try with another name" });
        }
    } catch (error) {
        console.error("Error saving product", error);
        return res.redirect("/admin/page-error");
    }
};

const getAllProducts = async(req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 4;
        const skip = (page - 1) * limit;

        const searchQuery = req.query.search || '';
        const findConditions = searchQuery 
            ? { productName: { $regex: searchQuery, $options: 'i' } }
            : {};

        const productData = await Product.find(findConditions)
            .sort({createdAt: -1})
            .skip(skip)
            .limit(limit)
            .populate('category')  
            .exec();

        const totalProducts = await Product.countDocuments(findConditions);
        const totalPages = Math.ceil(totalProducts / limit);

        const category = await Category.find({isListed: true});

        const validatedPage = Math.min(page, totalPages);
        
        let startPage = Math.max(1, validatedPage - 1);
        let endPage = Math.min(totalPages, validatedPage + 1);

        if (endPage - startPage + 1 < 3) {
            if (startPage === 1) {
                endPage = Math.min(3, totalPages);
            } else if (endPage === totalPages) {
                startPage = Math.max(1, totalPages - 2);
            }
        }

        res.render("products", {
            data: productData,
            currentPage: validatedPage,
            totalPages: totalPages,
            totalProducts: totalProducts,
            cat: category,
            startPage: startPage,
            endPage: endPage,
            searchQuery: searchQuery
        });

    } catch (error) {
        console.error('Error in getAllProducts:', error);
        res.redirect("/admin/page-error");
    }
}

const blockProduct = async(req,res) => {
    try {
        let id =req.query.id;

        await Product.updateOne({_id:id},{$set:{isBlocked:true}});
        const carts = await Cart.find(
            { "items.productId": id },
            { "items.$": 1, subTotal: 1 }
          ).populate("items")
          for (let cart of carts) {
            let totalDecrement = 0;
            
            for (let item of cart.items) {
                console.log(item);
                
                if (item.productId == id) {
                    totalDecrement = item.Quantity * item.price;
                }
            }
            const newSubTotal = cart.subTotal-totalDecrement
            console.log(newSubTotal);
            
            await Cart.updateOne(
                { _id: cart._id },
                {
                    $pull: { items: { productId: id } },    
                    $set: { subTotal: newSubTotal }        
                }
            );
        }
        await Whishlist.updateMany(
            {productId:id},
            {$pull:{productId:id}}
        )
        res.redirect("/admin/products");
    } catch (error) {
        res.redirect("/admin/page-error")
    }
}

const unblockProduct = async (req,res) => {
    try {
        let id = req.query.id;
        await Product.updateOne({_id:id},{$set:{isBlocked:false}});
        res.redirect("/admin/products")
    } catch (error) {
        res.redirect("/admin/page-error")
    }
}

const getEditProduct = async (req, res) => {
    try {
        const id = req.query.id;
        const product = await Product.findOne({_id: id});
        const existingCategory = await Category.findOne({_id: product.category, isListed: true});
        const category = await Category.find({isListed: true});

        const normalizedImages = [...(product.productImage || [])];
        while (normalizedImages.length < 4) {
            normalizedImages.push(null);
        }
        product.productImage = normalizedImages;

        res.render("edit-product", {
            product: product,
            pcat: existingCategory ? existingCategory : false,
            cat: category
        });
        
    } catch (error) {
        console.error("Error in getEditProduct:", error);
        res.redirect("/admin/page-error");
    }
}

const editProduct = async (req, res) => {
    try {
        const id = req.params.id;
        const product = await Product.findById(id);

        if (!product) {
            return res.status(404).json({ error: "Product not found." });
        }

        const data = req.body;
        const category = await Category.findOne({ name: data.category, isListed: true });

        const newImages = req.files.map(file => file.filename);

        const carts = await Cart.find({ "items.productId": id });

        for (const cart of carts) {
            for (const item of cart.items) {
                if (item.productId.toString() === id) {
                    if (item.Quantity > data.quantity) {
                        item.Quantity = data.quantity; 
                    }

                    item.price = data.salePrice;
                    item.totalPrice = item.Quantity * data.salePrice;
                }
            }

            cart.subTotal = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);

            await cart.save();
        }

        const updateFields = {
            productName: data.productName,
            category: category._id,
            description: data.description,
            specification: data.specification,
            regularPrice: data.regularPrice,
            salePrice: data.salePrice,
            quantity: data.quantity,
            size: data.size,
        };

        if (newImages.length > 0) {
            let currentImages = [...product.productImage];

            newImages.forEach((newImage, index) => {
                if (index < 4) {
                    if (currentImages[index]) {
                        const oldImagePath = path.join("public", "uploads", "re-image", currentImages[index]);
                        if (fs.existsSync(oldImagePath)) {
                            fs.unlinkSync(oldImagePath);
                        }
                        currentImages[index] = newImage;
                    } else {
                        currentImages.push(newImage);
                    }
                }
            });

            currentImages = currentImages.slice(0, 4);
            updateFields.productImage = currentImages;
        }

        await Product.findByIdAndUpdate(id, updateFields, { new: true });
        res.redirect("/admin/products");

    } catch (error) {
        console.error("Error updating product:", error.message);
        res.redirect("/admin/page-error");
    }
};




const deleteSingleImage = async (req, res) => {
    try {
        const { imageNameToServer, productIdServer } = req.body;

        await Product.findByIdAndUpdate(productIdServer, {
            $pull: { productImage: imageNameToServer }
        });

        // Path to the image to be deleted
        const imagePath = path.join("public", "uploads", "re-image", imageNameToServer);
        
        // Check if the image exists and then delete it
        if (fs.existsSync(imagePath)) {
            await fs.unlinkSync(imagePath);
            console.log(`Image ${imageNameToServer} deleted successfully.`);
        } else {
            console.log(`Image ${imageNameToServer} not found.`);
        }

        res.send({ status: true });

    } catch (error) {
        console.error("Error deleting image:", error.message);
        res.redirect("/admin/page-error");
    }
};



module.exports = {
    getProductAddPage,
    addProducts,
    getAllProducts,
    blockProduct,
    unblockProduct,
    getEditProduct,
    editProduct,
    deleteSingleImage
};
