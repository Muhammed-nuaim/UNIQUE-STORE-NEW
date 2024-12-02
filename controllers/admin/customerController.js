const User = require('../../models/userModel');

const customerInfo = async (req, res) => {
    try {
        let search = "";
        if (req.query.search) {
            search = req.query.search;
        }

        let page = 1;
        if (req.query.page) {
            page = parseInt(req.query.page);
        }

        let limit = 3;

      
        const userData = await User.find({
            isAdmin: false,
            $or: [
                { name: { $regex: "." + search + ".", $options: 'i' } }, 
                { email: { $regex: "." + search + ".", $options: 'i' } }
            ],
        })
        .limit(limit) 
        .skip((page - 1) * limit)
        .exec();

     
        const count = await User.countDocuments({
            isAdmin: false,
            $or: [
                { name: { $regex: "." + search + ".", $options: 'i' } },
                { email: { $regex: "." + search + ".", $options: 'i' } }
            ],
        });

      
        const totalPages = Math.ceil(count / limit);

 
        res.render("customers", {
            data: userData,      
            currentPage: page,  
            totalPages: totalPages,
            search: search        
        });
    } catch (error) {
        console.error("Error fetching customer data:", error);
        res.status(500).send("Internal Server Error");
    }
};


const  customerBlocked = async (req,res)=>{
    try {
        id = req.query.id
        await User.updateOne({_id:id},{$set:{isBlocked:true}})
        req.session.user = false
        res.redirect('/admin/users')
    } catch (error) {
        res.redirect('/page-error')
        
    }
}


const customerUnblocked = async (req,res)=>{
    try {
        id = req.query.id
        await User.updateOne({_id:id},{$set:{isBlocked:false}})
        res.redirect('/admin/users')
    } catch (error) {
        res.redirect('/page-error')
        
    }
}




module.exports = {
    customerInfo,
    customerUnblocked,
    customerBlocked,
};