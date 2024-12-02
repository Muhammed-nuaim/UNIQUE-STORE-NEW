const User = require("../../models/userModel")
const mongoose =require("mongoose");
const bcrypt = require("bcrypt");


const pageerror = async(req,res) => {
    try {
        res.render("page-error-404")
    } catch (error) {
        console.log(error);
        
    }
}


const loadLogin = async(req,res) => {
    if (req.session.admin) {
        return res.redirect("/admin")
    } else{
        res.render("admin-login")
    }
}
 
const login = async (req,res) => {
    try {
        const {email,password} = req.body;
        const admin = await User.findOne ({email,isAdmin:true})
        if(admin) {   
            const passwrodMatch =await  bcrypt.compare(password,admin.password)
            if (passwrodMatch) {
                req.session.admin =  true;
                return res.redirect ("/admin/loadDashboard")
            } else {
                return res.redirect("/admin/login")
            }
        } else {
            return res.redirect("/admin/login")
        }
    } catch (error) {
        console.log ("login error".error)
        return res.redirect("/admin/page-error")
    }
}

const logout = async (req,res) => {
    try {
        req.session.admin = false
        if(req.session.admin){
            res.redirect("/admin/page-error")
        } else{
            res.redirect("/admin/login")
        }
    } catch (error) {
        console.log("unexpected error during logout",error)
        res.redirect("/admin/page-error")
    }
}
    


module.exports = {
    pageerror,
    loadLogin,
    login,
    logout
}