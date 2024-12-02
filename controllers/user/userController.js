const User = require("../../models/userModel");
const Category = require("../../models/CategoryModel");
const Product = require("../../models/productModel")
const Whishlist = require("../../models/whishlistModel")
const bcrypt = require("bcrypt");
const nodeMailer = require("nodemailer");

const pageNotFound = async (req, res) => {
    try {
        res.render("page-404");
    } catch (error) {
        res.redirect('/pageNotFound');
    }
};

const loadHomePage = async (req, res) => {
    try {
        const user = req.session.user;
        let wishlistProductIds = [];
        if (user) {
            const wishlist = await Whishlist.findOne({ userId: user.id });
            wishlistProductIds = wishlist ? wishlist.productId.map(id => id.toString()) : [];
        }

        const Categories = await Category.find({isListed:true});
        let productData = await Product.find(
            {isBlocked:false,
            category:{$in:Categories.map(category => category._id)}
            })

            productData.sort((a,b) => new Date(b.createdOn)-new Date(a.createdOn))
            productData = productData.slice(0,8)

        if (user) {
            const verifyuser = await User.findOne({_id:user.id,isBlocked:false})
            if(verifyuser){
                res.render("home", { user,wishlistProductIds, products: productData });
            } else {
                req.session.user = false
                return res.render('home',{wishlistProductIds:false,products:productData});
            }
        } else {
            return res.render('home',{wishlistProductIds:false,products:productData});
        }
    } catch (error) {
        console.log("Home page is not found", error);
        res.status(500).send("Server error");
    }
};

const loadSignup = async (req, res) => {
    try {
        return res.render("sign-up");
    } catch (error) {
        console.log("Sign Up page is not found", error);
        res.status(500).send("Server error");
    }
};

function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendVerificationEmail(email, otp) {
    try {
        const transporter = nodeMailer.createTransport({
            service: 'gmail',
            port: 587,
            secure: true,
            requireTLS: true,
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD
            }
        });

        const info = await transporter.sendMail({
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "Verify your account",
            text: `Your OTP is ${otp}`,
            html: `<b>Your OTP: ${otp}</b>`
        });

        return info.accepted.length > 0;
    } catch (error) {
        console.error("Error sending email", error);
        return false;
    }
}

const signup = async (req, res) => {
    try {
        const { name, email, password, cpassword } = req.body;

        if (password !== cpassword) {
            return res.render("sign-up", { message: "Passwords do not match" });
        }

        const findUser = await User.findOne({ email });

        if (findUser) {
            return res.render('sign-up', { message: "This email is already registered" });
        }

        const otp = generateOtp();
        const emailSent = await sendVerificationEmail(email, otp);

        if (!emailSent) {
            return res.json("email-error");
        }

        req.session.userOtp = otp;
        req.session.userData = { name, email, password };

        res.render("otp");
        console.log("OTP Sent", otp);

    } catch (error) {
        console.error("Signup error", error);
        res.redirect("/pageNotFound");
    }
};

const loadLogin = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.render("login");
        } else {
            res.redirect('/');
        }
    } catch (error) {
        res.redirect('/pageNotFound');
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const findUser = await User.findOne({ email });

        if (!findUser) {
            return res.render('login', { message: "User not found" });
        }
        if (findUser.isBlocked) {
            return res.render('login', { message: "User is blocked by admin" });
        }

        const passwordMatch = await bcrypt.compare(password, findUser.password);
        if (!passwordMatch) {
            return res.render('login', { message: "Incorrect Password" });
        }

        req.session.user = { id: findUser._id, name: findUser.name, email: findUser.email };
        res.redirect('/');

    } catch (error) {
        console.error("Login error", error);
        res.render('login', { message: "Login Failed, Please try again later" });
    }
};

const securePassword = async (password) => {
    try {
        return await bcrypt.hash(password, 10);
    } catch (error) {
        console.error("Error securing password", error);
    }
};

const verifyOtp = async (req, res) => {
    try {
        const { otp } = req.body;

        if (otp === req.session.userOtp) {
            const user = req.session.userData;
            const passwordHash = await securePassword(user.password);

            const saveUserData = new User({
                name: user.name,
                email: user.email,
                password: passwordHash
            });
            await saveUserData.save();

            req.session.user = { id: saveUserData._id, name: saveUserData.name, email: saveUserData.email };

            res.json({ success: true, redirectUrl: "/" });
        } else {
            res.status(400).json({ success: false, message: "Invalid OTP, Please try again" });
        }
    } catch (error) {
        console.error("Error Verifying OTP", error);
        res.status(500).json({ success: false, message: "An error occurred" });
    }
};

const resendOtp = async (req, res) => {
    try {
        const { email } = req.session.userData;
        if (!email) {
            return res.status(400).json({ success: false, message: "Email not found in session" });
        }

        const otp = generateOtp();
        req.session.userOtp = otp;

        const emailSent = await sendVerificationEmail(email, otp);
        if (emailSent) {
            console.log("Resend OTP:", otp);
            res.status(200).json({ success: true, message: "OTP Resent Successfully" });
        } else {
            res.status(500).json({ success: false, message: "Failed to resend OTP, Please try again" });
        }
    } catch (error) {
        console.log("Error resending OTP", error);
        res.status(500).json({ success: false, message: "Internal Server Error, Please try again" });
    }
};

const logout = async (req, res) => {
    try {
        req.session.user = null;
        if(!req.session.user){
        res.redirect("/")
        }
    } catch (error) {
        console.log("Logout error", error);
        res.redirect("/pageNotFound");
    }
};

module.exports = {
    pageNotFound,
    loadHomePage,
    loadSignup,
    signup,
    loadLogin,
    login,
    verifyOtp,
    resendOtp,
    logout
};
