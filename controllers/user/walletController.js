const User = require("../../models/userModel");
const Wallet = require("../../models/walletModel");
const axios = require("axios");



const loadWallet = async (req,res) => {
    try {
        const user = req.session.user;
        const existingUserWallet = await Wallet.findOne({userId:user.id}).populate("transactions")        

        if(existingUserWallet) {
            existingUserWallet.transactions.sort((a, b) => b.transactionDate - a.transactionDate);
            res.render('walletPage',{walletDetails:existingUserWallet,user})
        } else {
            res.render('walletPage',{user,walletDetails:false})
        }
    } catch (error) {
        console.log("loading the Wallet Page has some issues", error);
        res.status(500).json({success:false,message:"Server error"})
    }
}

const addMoneyToWallet = async(req,res) => {
    try {
        const addAmount = req.session.walletAmount.addAmount
        const user = req.session.user
        const existingUserWallet = await Wallet.findOne({userId:user.id})

        if(user) {
            if(existingUserWallet) {
                const newBalance = Number(existingUserWallet.balance) + Number(addAmount)
                
                await Wallet.updateOne(
                    { userId: user.id },
                    {
                        $set: { balance: newBalance },
                        $push: {
                            transactions: {
                                tranctransactionDate: Date.now(),
                                transactionType: "Deposit",
                                transactionStatus: "Completed",
                                amount: addAmount
                            }
                        }
                    }
                );
    
                res.redirect('/wallet')
            } else {
                const newWallet = new Wallet({
                    userId:user.id,
                    balance:addAmount,
                    transactions:[{
                        tranctransactionDate: Date.now(),
                        transactionType:"Deposit",
                        transactionStatus:"Completed",
                        amount:addAmount
                    }]
                })
                await newWallet.save()
                res.redirect('/wallet')
            }
        } else {
            res.redirect('/wallet')
        }


    } catch (error) {
        console.log("Money adding in wallet has some issues", error);
        res.status(500).json({success:false,message:"Server error"})
    }
}


const convertCurrency = async (amount) => {
    try {
      const apiKey = process.env.OPEN_EXCHANGE_API_KEY; 
      const fromCurrency = 'INR'
      const toCurrency = 'USD'
  
      const response = await axios.get(`https://openexchangerates.org/api/latest.json?app_id=${apiKey}`);
      
      if (response.data && response.data.rates) {
        const usdToInrRate = response.data.rates[fromCurrency];
        const usdToUsdRate = response.data.rates[toCurrency];
        const convertedAmount = amount * (usdToUsdRate / usdToInrRate);
        
        return convertedAmount.toFixed(2);
      } else {
        throw new Error('Unable to retrieve exchange rates.');
      }
  
    } catch (error) {
      console.error('Currency conversion error:', error);
      throw error;
    }
  };  


const paypal = require('paypal-rest-sdk');
paypal.configure({
  'mode': process.env.PAYPAL_MODE,
  'client_id': process.env.PAYPAL_CLIENT_ID,
  'client_secret': process.env.PAYPAL_SECRET_ID
});

const getPayPal = async(req,res) => {
    try {
        const addAmount = req.body.addAmount
        const USDCurrency = await convertCurrency(addAmount);
        
        req.session.walletAmount = {
            USDCurrency: USDCurrency,
            addAmount:addAmount
        }
        
        const create_payment_json = {
            "intent": "sale",
            "payer": {
                "payment_method": "Paypal"
            },
            "redirect_urls": {
                "return_url": "https://unique.nuaim.tech/walletSuccessPayPal",
                "cancel_url": "https://unique.nuaim.tech/walletCancelPayPal"
            },
            "transactions": [{
                "item_list": {
                    "items": [{
                        "name": "Red Sox Hat",
                        "sku": "001",
                        "price": USDCurrency,
                        "currency": "USD",
                        "quantity": 1
                    }]
                },
                "amount": {
                    "currency": "USD",
                    "total": USDCurrency
                },
                "description": "Hat for the best team ever"
            }]
        };

        paypal.payment.create(create_payment_json, function (error, payment) {
            if (error) {
                console.error("PayPal payment creation error:", error);
                res.status(500).json({ success: false, message: "PayPal payment creation failed." });
            } else {
                const approvalUrl = payment.links.find(link => link.rel === 'approval_url');
                if (approvalUrl) {
                    res.json({ success: true, approval_url: approvalUrl.href });
                } else {
                    res.status(500).json({ success: false, message: "Approval URL not found." });
                }
            }
        });
    } catch (error) {
        console.error("PayPal payment creation error:", error);
        res.status(500).json({ success: false, message: "PayPal payment creation failed." });
    }
}


const successPayPal = async (req,res) => {
    try {
            const payerId = req.query.PayerID;
            const paymentId = req.query.paymentId;
            const walletData = req.session.walletAmount;
          
            const execute_payment_json = {
              "payer_id": payerId,
              "transactions": [{
                  "amount": {
                      "currency": "USD",
                      "total": walletData.USDCurrency
                  }
              }]
            };
          
            paypal.payment.execute(paymentId, execute_payment_json, function (error) {
              if (error) {   
                  console.log(error.response);
                  throw error;
              } else {
                  res.redirect("/addMoneyToWallet")
              }
          });
    } catch (error) {
        console.error("PayPal payment Success error:", error);
        res.status(500).json({ success: false, message: "PayPal payment Doesn't Success." });
    }
}

const cancelPayPal = async(req,res) => {
    try {
            res.redirect("/wallet")
    } catch (error) {
        console.error("PayPal payment Cancelation error:", error);
        res.status(500).json({ success: false, message: "PayPal payment Cancelation failed." });
    }
}


module.exports = {
    loadWallet,
    addMoneyToWallet,
    getPayPal,
    successPayPal,
    cancelPayPal
}