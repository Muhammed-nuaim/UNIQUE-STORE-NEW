const express = require("express");
const admin_route = express.Router();
const multer = require('multer'); // Import Multer
const shart = require('sharp');
const path = require('path');
const customerController = require("../controllers/admin/customerController");
const adminController = require("../controllers/admin/adminController");
const categoryController = require("../controllers/admin/categoryController");
const productController = require("../controllers/admin/productController");
const orderdetailsController = require("../controllers/admin/orderdetailsController");
const offerController = require("../controllers/admin/offerController");
const couponController = require("../controllers/admin/couponController");
const salesController = require("../controllers/admin/salesController");
const { userAuth, adminAuth } = require("../middlewares/auth");
// const { path } = require("pdfkit");

// Configure Multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "public/uploads/re-image");
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, `${file.fieldname}-${uniqueSuffix}-${file.originalname}`);
    },
});

const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml", "image/webp"];
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Unsupported file type. Only PNG, JPG, JPEG, SVG, and WEBP are allowed."), false);
    }
};

const uploads = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB file size limit
    fileFilter,
});

admin_route.get("/page-error", adminController.pageerror);
admin_route.get("/login", adminController.loadLogin);
admin_route.post("/login", adminController.login);
admin_route.get("/logout", adminController.logout);
admin_route.get("/", adminAuth, salesController.loadSalesPage);
admin_route.get("/users", adminAuth, customerController.customerInfo);
admin_route.get("/blockCustomer", adminAuth, customerController.customerBlocked);
admin_route.get("/unblockCustomer", adminAuth, customerController.customerUnblocked);
admin_route.get("/category", adminAuth, categoryController.categoryInfo);
admin_route.post("/addCategory", adminAuth, categoryController.addCategory);
admin_route.get("/listCategory", adminAuth, categoryController.listCategory);
admin_route.get("/unlistCategory", adminAuth, categoryController.unlistCategory);
admin_route.get("/editCategory", adminAuth, categoryController.getEditCategory);
admin_route.post("/editCategory/:id", adminAuth, categoryController.editCategory);
admin_route.get("/deleteCategory", adminAuth, categoryController.deleteCategory);

// Product Management
admin_route.get("/addProducts", adminAuth, productController.getProductAddPage);
admin_route.post("/addProducts", adminAuth, uploads.array("images", 4), productController.addProducts); // Ensure the route uses uploads
admin_route.get("/products",adminAuth,productController.getAllProducts);
admin_route.get("/blockProduct",adminAuth,productController.blockProduct);
admin_route.get("/unblockProduct",adminAuth,productController.unblockProduct);
admin_route.get("/editProduct",adminAuth,productController.getEditProduct);
admin_route.post("/editProduct/:id",adminAuth, uploads.array("images", 4),productController.editProduct)
admin_route.post("/deleteImage",adminAuth,productController.deleteSingleImage);

//Order Management
admin_route.get("/orderList",adminAuth,orderdetailsController.getOrderList);
admin_route.get("/orderDetails",adminAuth,orderdetailsController.getOrderDetails);
admin_route.post("/updateStatus",adminAuth,orderdetailsController.updateStatus);
admin_route.patch("/cancellOrder",adminAuth,orderdetailsController.cancellOrder);
admin_route.post("/approveReturn",adminAuth,orderdetailsController.approveReturn);
admin_route.post("/rejectReturn",adminAuth,orderdetailsController.rejectReturn)


//Offer Management
admin_route.get("/productOffer",adminAuth, offerController.getProductOffer)
admin_route.get("/categoryOffer",adminAuth, offerController.getCategoryOffer)
admin_route.post("/addProductOffer",adminAuth,offerController.addProductOffer)
admin_route.post("/addCategoryOffer",adminAuth,offerController.addCategoryOffer)
admin_route.delete("/removeProductOffer",adminAuth,offerController.deleteProductOffer);
admin_route.delete("/removeCategoryOffer",adminAuth,offerController.deleteCategoryOffer);

//coupon Management
admin_route.get("/couponManagement",adminAuth,couponController.getCouponManagement);
admin_route.post("/addCoupon",adminAuth,couponController.addCoupon);
admin_route.patch("/unlistCoupon",adminAuth,couponController.unlistCoupon);
admin_route.patch("/listCoupon",adminAuth,couponController.listCoupon);
admin_route.delete("/removeCoupon",adminAuth,couponController.deleteCoupon);

//salesManagement
admin_route.get("/loadDashboard", adminAuth, salesController.loadSalesPage);
admin_route.get("/salesReport",adminAuth,salesController.loadSalesPage);
// admin_route.get("/salesChart",adminAuth,salesController.loadSalesChartPage);
admin_route.get('/downloadSalesReportInPdf',salesController.downloadSalesReportInPdf);
admin_route.get('/downloadSalesReportInExcel',salesController.downloadSalesReportInExcel)

module.exports = admin_route;