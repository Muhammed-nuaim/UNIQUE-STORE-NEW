const { MongoCryptCreateEncryptedCollectionError } = require("mongodb");
const Category = require("../../models/CategoryModel")

const categoryInfo = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 4;
        const skip = (page - 1) * limit;

        const categoryData = await Category.find({})
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalCategories = await Category.countDocuments();
        const totalPages = Math.ceil(totalCategories / limit);
        res.render("category", {
            cat: categoryData,
            currentPage: page,
            totalPages: totalPages,
            totalCategories: totalCategories
        });
    } catch (error) {
        console.error(error);
        res.redirect("/admin/page-error");
    }
}

const addCategory = async (req, res) => {
    const { name, description } = req.body;
    try {
        const existingCategory = await Category.findOne({ name });
        if (existingCategory) {
            return res.status(400).json({ error: "Category already exists" });
        }

        const newCategory = new Category({
            name,
            description,
        });

        await newCategory.save();
        return res.status(201).json({ message: "Category Added Successfully" });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

const listCategory = async (req,res) => {
    try {
        let id = req.query.id;
        await Category.updateOne({_id:id},{$set:{isListed:false}});
        res.redirect("/admin/category")
    } catch (error) {
        res.redirect("/admin/page-error")
    }
}

const unlistCategory = async (req,res) => {
    try {
        let id = req.query.id;
        await Category.updateOne({_id:id},{$set:{isListed:true}});
        res.redirect("/admin/category")
    } catch (error) {
        res.redirect("/admin/page-error")
    }
}

const getEditCategory = async (req,res) => {
    try {
        const id = req.query.id;
        const category = await Category.findOne({_id:id});
        res.render("edit-category",{category:category});
    } catch (error) {
        res.redirect("/admin/page-error")
    }
}

const editCategory = async (req, res) => {
    try {
        const id = req.params.id;
        const { categoryName, description } = req.body;

        // Check if the category already exists
        const givenCategory = await Category.findOne({_id:id });
        const existingCategory = await Category.findOne({name:categoryName})
        
        if (existingCategory) {
            if(existingCategory.name !== givenCategory.name){
                return res.status(400).json({ error: "Category exists, please choose another name." });
            } 
        }

        // Update the category
        const updateCategory = await Category.findByIdAndUpdate(id, {
            name: categoryName,
            description: description,
        }, { new: true });

        if (updateCategory) {
            // Send a successful response
            res.status(200).json({ message: "Category updated successfully" });
        } else {
            res.status(404).json({ error: "Category not found" });
        }

    } catch (error) {
        console.error("Error updating category:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};


const deleteCategory = async (req,res) => {
    try {
        const {id} = req.query;
        if(!id) {
            return res.status(400).redirect("/admin/page-error")
        }
        await Category.deleteOne({_id:id});
        res.redirect("/admin/category")
    } catch (error) {
        console.error("Error deleting brand:",error)
        res.status(500).redirect("/admin/page-error")
    }
}

module.exports = {
    categoryInfo,
    addCategory,
    listCategory,
    unlistCategory,
    getEditCategory,
    editCategory,
    deleteCategory
}
