const User = require("../../models/userModel");
const Product = require("../../models/productModel");
const Category = require("../../models/CategoryModel");
const Address = require("../../models/addressModel");
const Cart =require("../../models/cartModel");
const Order = require("../../models/orderModel")
const Wallet = require("../../models/walletModel");
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');


const loadMyOrders = async (req, res) => {
    try {
        const user = req.session.user;
        const existingUser = await User.findOne({ _id: user.id });

        if (!existingUser) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        
        const limit = parseInt(req.query.limit) || 5; 
        const page = parseInt(req.query.page) || 1;  
        const skip = (page - 1) * limit;             

        
        const statusFilter = req.query.status && req.query.status !== "Show all"
            ? { "status": req.query.status }
            : {};

        
        const orderQuery = { userId: existingUser._id, ...statusFilter };
        const existingOrder = await Order.find(orderQuery)
            .sort({ createdOn: -1 })
            .skip(skip)
            .limit(limit)
            .populate("orderedItems", "address");

        
        const totalOrders = await Order.countDocuments(orderQuery);

        
        res.render('myOrders', {
            user,
            userData: existingUser,
            orderData: existingOrder.length > 0 ? existingOrder : false,
            addressData: existingUser.addresses || false,
            status: req.query.status || "Show all",
            currentPage: page,
            totalPages: Math.ceil(totalOrders / limit),
            limit,
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "An error occurred. Please try again" });
    }
};

const getOrders = async(req,res) => {
    try {
        const user = req.session.user;

        const existingUser = await User.findOne({_id:user.id})
        const existingOrder = await Order.findMany({userId:existingUser._id,status:{ $ne: 'Delivered' }}).sort({ createdOn: -1 }).populate("orderedItems").populate("address").populate("orderedItems.productId")
        
        if(existingOrder) {
            res.render('my-orders',{existingOrder,user})
        } else {
            res.redirect('/admin/page-error')
        }
    } catch (error) {
        res.status(500)
    }
}


const getOrderDetails = async (req,res) => {
    try {
        const id = req.query.id
        const user = req.session.user

        const existingUser = await User.findOne({_id:user.id});
        const orderDetails = await Order.findOne({_id:id}).populate("orderedItems").populate("address").populate("orderedItems.productId")
        

        if(orderDetails,existingUser) {
            res.render('orderDetails',{orderDetails,user})
        } else {
            res.redirect('/pageNotFound')
        }
    } catch (error) {
        console.error(error,"server error")
    }
}

const cancellOrder = async(req,res) => {
    try {
        const id = req.body.orderId
        const user = req.session.user
        const existingUser = await User.findOne({_id:user.id});
        const orderDetails = await Order.findOne({_id:id})
        const existingUserWallet = await Wallet.findOne({userId:user.id})
        const status = orderDetails.status

        if(existingUser && orderDetails && status != 'Shipped' && status !='Delivered') {
            await Order.updateOne(
                {_id:id},
                {cancelled:true,status:"Cancelled"}
            )
            const productId = orderDetails.orderedItems.map((item) => item)
            for(let item of productId) {
                await Product.updateMany(
                    {_id:item.productId},
                    {$inc: {quantity:item.quantity}}
                )
            }
            if(existingUserWallet && orderDetails.paymentMethod != "Cash on Delivery") {
                const newBalance = Number(existingUserWallet.balance) + Number(orderDetails.finalAmount)
                await Wallet.updateOne(
                    {userId:user.id},
                    {
                        $set: { balance: newBalance },
                        $push: {
                            transactions: {
                                tranctransactionDate: Date.now(),
                                transactionType: "Credit",
                                transactionStatus: "Completed",
                                amount: orderDetails.finalAmount
                            }
                        }
                    }
                )
            } else if (orderDetails.paymentMethod == "Cash on Delivery") {
                return res.status(200).json({success:true,message:"Order Cancelled Successfully"})
            } else {
                const newWallet = new Wallet({
                    userId:user.id,
                    balance:finalAmount,
                    transactions:[{
                        tranctransactionDate: Date.now(),
                        transactionType:"Credit",
                        transactionStatus:"Completed",
                        amount:finalAmount
                    }]
                })
                await newWallet.save()
            }
            res.status(200).json({success:true,message:"Order Cancelled Successfully And Amount returned To Your Wallet"})
        } else if (status == "Delivered") {
            res.status(201).json({success:false,message:"Order is Already Delivered"})
        }else {
            res.status(201).json({success:false,message:"Order is Already Shipped"})
        }
    } catch (error) {
        res.status(500).json({success:false,error})
    }
}


const returnOrder = async (req,res) => {
    try {
        const id = req.body.orderId;
        const reason = req.body.reason;
        const user = req.session.user;
        const existingUser = await User.findOne({_id:user.id});
        const orderDetails = await Order.findOne({_id:id});

        if(existingUser && orderDetails) {
            await Order.updateOne(
                {_id:id},
                {status:"Return Request",returnReason:reason}
            )
        res.status(200).json({success:true,message:"Return Request will be Processed by Admin"})
        } else {
            res.status(201).json({success:false,message:"Not find This order,Please Try again"})
        }
        
        
    } catch (error) {
        res.status(500).json({success:false,error})
    }
}

// const individualCancelation = async (req, res) => {
//     try {
//         const { orderId, itemId } = req.body; // Extract order and item IDs from request body
//         const user = req.session.user; // Extract user from session
//         const existingUser = await User.findOne({ _id: user.id }); // Fetch user data
//         const orderDetails = await Order.findOne({ _id: orderId, "orderedItems._id": itemId }); // Fetch order details
//         const existingUserWallet = await Wallet.findOne({ userId: user.id }); // Fetch wallet if exists

//         if (!existingUser || !orderDetails) {
//             return res.status(400).json({ success: false, message: "Invalid user or order details" });
//         }

//         const status = orderDetails.status; // Overall order status
//         const item = orderDetails.orderedItems.find(item => item._id.toString() === itemId); // Find the specific item
//         if (!item) {
//             return res.status(400).json({ success: false, message: "Item not found in order" });
//         }

//         if (status === "Shipped" || status === "Delivered") {
//             return res.status(400).json({ success: false, message: `Order is already ${status}` });
//         }

//         // Extract item-specific details
//         const { productId, quantity, totalPrice, offerPrice } = item;
//         const couponDiscount = orderDetails.couponDiscount / orderDetails.orderedItems.length;

//         // Calculate new final amount and delivery charge
//         const refundAmount = totalPrice - couponDiscount;
//         const newFinalAmount = orderDetails.finalAmount - refundAmount;
//         console.log("productId:",productId,"quantity:",quantity,"itemPrice:",totalPrice,"offerPrice:",offerPrice,"couponDiscount:",couponDiscount,"newfinalAmount:",newFinalAmount);

//         // Update the specific item's status and order fields
//         await Order.updateOne(
//             { _id: orderId, "orderedItems._id": itemId },
//             {
//                 $set: {
//                     "orderedItems.$.status": "Cancelled",
//                     "orderedItems.$.cancelled": true,
//                 },
//                 $inc: {
//                     offerDiscount: -offerPrice,
//                     couponDiscount: -couponDiscount,
//                     totalDiscount: -(offerPrice + couponDiscount),
//                     finalAmount: -refundAmount
//                 }
//             }
//         );

//         const verifyOrder = await Order.findOne(
//             {_id:orderId,"orderedItems.cancelled":false}
//         )
//         if(!verifyOrder) {
//             await Order.updateOne(
//                 {_id:orderId},
//                 {cancelled:true,status:"Cancelled",$inc: {finalAmount: -orderDetails.deliveryCharge}}
//             )
//         }

//         // Return the product quantity to inventory
//         if (productId && quantity) {
//             await Product.updateOne(
//                 { _id: productId },
//                 { $inc: { quantity } }
//             );
//         }

//         // Handle wallet updates for non-COD payments
//         if (orderDetails.paymentMethod !== "Cash on Delivery") {
//             if (existingUserWallet) {
//                 // Update existing wallet
//                 const newBalance = Number(existingUserWallet.balance) + refundAmount;
//                 await Wallet.updateOne(
//                     { userId: user.id },
//                     {
//                         $set: { balance: verifyOrder? newBalance : (newBalance - orderDetails.deliveryCharge ) },
//                         $push: {
//                             transactions: {
//                                 transactionDate: Date.now(),
//                                 transactionType: "Credit",
//                                 transactionStatus: "Completed",
//                                 amount: refundAmount+orderDetails.deliveryCharge
//                             }
//                         }
//                     }
//                 );
//             } else {
//                 // Create a new wallet for the user
//                 const newWallet = new Wallet({
//                     userId: user.id,
//                     balance: refundAmount,
//                     transactions: [
//                         {
//                             transactionDate: Date.now(),
//                             transactionType: "Credit",
//                             transactionStatus: "Completed",
//                             amount: refundAmount
//                         }
//                     ]
//                 });
//                 await newWallet.save();
//             }
//             return res.status(200).json({
//                 success: true,
//                 message: "Product Cancelled Successfully And Amount Returned To Your Wallet"
//             });
//         }

//         // For COD payments, no wallet action needed
//         return res.status(200).json({
//             success: true,
//             message: "Product Cancelled Successfully"
//         });

//     } catch (error) {
//         console.error("Error during cancellation:", error);
//         res.status(500).json({ success: false, error });
//     }
// };


const downloadInvoice = async (req, res) => {
    try {
        const orderId = req.query.orderId;
        const existingOrder = await Order.findOne({ _id: orderId })
            .populate("orderedItems")
            .populate("address")
            .populate("orderedItems.productId");

        if (!existingOrder) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        // Create directory if it doesn't exist
        const invoicesDir = path.join(__dirname, '../../invoices');
        if (!fs.existsSync(invoicesDir)) {
            fs.mkdirSync(invoicesDir, { recursive: true });
        }

        const filePath = path.join(invoicesDir, `Invoice-${orderId}.pdf`);
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const writeStream = fs.createWriteStream(filePath);
        doc.pipe(writeStream);

        // Helper functions
        const drawTableLine = (x1, y1, x2, y2) => {
            doc.moveTo(x1, y1).lineTo(x2, y2).stroke('#666666');
        };

        const drawBox = (x, y, width, height, title = '') => {
            // Draw box with rounded corners
            doc.roundedRect(x, y, width, height, 5)
               .lineWidth(1)
               .stroke('#444444');

            if (title) {
                // Add title background
                doc.save()
                   .fillColor('#f5f5f5')
                   .rect(x + 1, y + 1, width - 2, 25)
                   .fill()
                   .restore();

                // Add title text
                doc.font('Helvetica-Bold')
                   .fontSize(14)
                   .fillColor('#333333')
                   .text(title, x + 10, y + 8, { width: width - 20 });
            }
        };

        // Header
        doc.font('Helvetica-Bold')
           .fontSize(24)
           .fillColor('#333333')
           .text("Invoice", { align: "center" });
        doc.moveDown();

        // Order information
        doc.fontSize(12)
           .font('Helvetica')
           .fillColor('#444444')
           .text(`Order ID: ${existingOrder.orderId || existingOrder._id}`)
           .text(`Date: ${new Date(existingOrder.createdOn).toLocaleDateString()}`)
           .text(`Status: ${existingOrder.status}`);
        doc.moveDown();

        // Customer and Order Info Boxes
        const boxStartY = doc.y;
        const boxWidth = 240;
        const boxHeight = 120;
        const boxGap = 20;

        // Customer Details Box
        drawBox(50, boxStartY, boxWidth, boxHeight, 'Customer Details');
        doc.font('Helvetica')
           .fontSize(11)
           .fillColor('#333333')
           .text(existingOrder.address[0].name, 60, boxStartY + 35)
           .text(existingOrder.address[0].phone, 60, boxStartY + 50)
           .text(`${existingOrder.address[0].city}, ${existingOrder.address[0].state}`, 60, boxStartY + 65)
           .text(`Pincode: ${existingOrder.address[0].pincode}`, 60, boxStartY + 80);

        // Order Info Box
        drawBox(50 + boxWidth + boxGap, boxStartY, boxWidth, boxHeight, 'Order Info');
        doc.text(`Payment Method: ${existingOrder.paymentMethod}`, 60 + boxWidth + boxGap, boxStartY + 35)
           .text(`Payment Status: ${existingOrder.paymentStatus}`, 60 + boxWidth + boxGap, boxStartY + 50)
           .text("Shipping: Express Delivery", 60 + boxWidth + boxGap, boxStartY + 65)
           .text(`Landmark: ${existingOrder.address[0].landMark || 'N/A'}`, 60 + boxWidth + boxGap, boxStartY + 80);

        doc.moveDown(6);

        // Products Table
        const tableTop = doc.y;
        const tableWidth = 500;
        const columns = {
            image: { x: 50, width: 80 },
            name: { x: 130, width: 150 },
            price: { x: 280, width: 70 },
            offerPrice: { x: 350, width: 70 },
            qty: { x: 420, width: 40 },
            total: { x: 460, width: 90 }
        };

        // Table header
        doc.save()
           .fillColor('#f5f5f5')
           .rect(50, tableTop, tableWidth, 25)
           .fill()
           .restore();

        doc.lineWidth(1)
           .rect(50, tableTop, tableWidth, 25)
           .stroke('#444444');

        // Header text
        doc.font('Helvetica-Bold')
           .fontSize(11)
           .fillColor('#333333');

        Object.entries(columns).forEach(([key, value]) => {
            const header = key.charAt(0).toUpperCase() + key.slice(1);
            doc.text(header, value.x + 5, tableTop + 8);
        });

        let currentY = tableTop + 25;

        // Table rows
        for (const item of existingOrder.orderedItems) {
            const rowHeight = 70;
            
            // Row background (alternating)
            doc.save()
               .fillColor(currentY % 140 === 25 ? '#fafafa' : '#ffffff')
               .rect(50, currentY, tableWidth, rowHeight)
               .fill()
               .restore();

            // Row border
            doc.rect(50, currentY, tableWidth, rowHeight)
               .lineWidth(1)
               .stroke('#666666');

            // Vertical lines
            Object.values(columns).forEach(col => {
                drawTableLine(col.x, currentY, col.x, currentY + rowHeight);
            });

            // Add image
            const imagePath = path.join(__dirname, '../../public/uploads/re-image', item.productImage[0]);
            if (fs.existsSync(imagePath)) {
                doc.image(imagePath, columns.image.x + 5, currentY + 5, { 
                    width: 60,
                    height: 60,
                    fit: [60, 60]
                });
            }

            // Add text content
            doc.font('Helvetica')
               .fontSize(10)
               .fillColor('#333333');

            doc.text(item.productName, columns.name.x + 5, currentY + 25, { 
                width: columns.name.width - 10
            });
            doc.text(`${item.productId.regularPrice}`, columns.price.x + 5, currentY + 25);
            doc.text(`${item.price}`, columns.offerPrice.x + 5, currentY + 25);
            doc.text(item.quantity.toString(), columns.qty.x + 5, currentY + 25);
            doc.text(`${item.totalPrice}`, columns.total.x + 5, currentY + 25);

            currentY += rowHeight;
        }

        // Summary section
        const summaryStartX = 310;
        const summaryWidth = 240;
        const summaryY = currentY + 20;

        drawBox(summaryStartX, summaryY, summaryWidth, 160, 'Order Summary');

        // Summary content
        doc.font('Helvetica')
           .fontSize(11)
           .fillColor('#333333');

        const summaryItems = [
            { label: 'Offer Discount:', value: `${existingOrder.offerDiscount}` },
            { label: 'Coupon Discount:', value: `${existingOrder.couponDiscount}` },
            { label: 'Delivery Charge:', value: `${existingOrder.deliveryCharge}` },
            { label: 'Total Saving:', value: `${existingOrder.totalDiscount}` }
        ];

        let currentSummaryY = summaryY + 35;
        summaryItems.forEach(item => {
            doc.text(item.label, summaryStartX + 15, currentSummaryY);
            doc.text(item.value, summaryStartX + summaryWidth - 80, currentSummaryY, { width: 65, align: 'right' });
            currentSummaryY += 20;
        });

        // Final amount
        doc.save()
           .fillColor('#f5f5f5')
           .rect(summaryStartX + 1, currentSummaryY + 5, summaryWidth - 2, 35)
           .fill()
           .restore();

        doc.font('Helvetica-Bold')
           .fontSize(12);
        doc.text('Total Amount:', summaryStartX + 15, currentSummaryY + 15);
        doc.text(`${existingOrder.finalAmount}`, summaryStartX + summaryWidth - 80, currentSummaryY + 15, 
            { width: 65, align: 'right' });

        // Footer
        doc.fontSize(9)
           .font('Helvetica')
           .fillColor('#666666')
           .text('Thank you for shopping with us!', 50, doc.page.height - 50, { 
               align: 'center',
               width: doc.page.width - 100
           });

        // Finalize PDF
        doc.end();

        // Send the file
        writeStream.on('finish', () => {
            res.download(filePath, `Invoice-${orderId}.pdf`, (err) => {
                if (err) {
                    console.error('Error downloading file:', err);
                    res.status(500).json({ success: false, message: "Error downloading the file" });
                }
                // Clean up
                fs.unlinkSync(filePath);
            });
        });

    } catch (error) {
        console.error('Error generating invoice:', error);
        res.status(500).json({ success: false, message: "Error generating invoice" });
    }
};


module.exports = {
    loadMyOrders,
    getOrders,
    getOrderDetails,
    cancellOrder,
    returnOrder,
    // individualCancelation,
    downloadInvoice
}