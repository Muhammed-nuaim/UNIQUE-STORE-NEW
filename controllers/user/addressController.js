const User = require("../../models/userModel")
const Address = require("../../models/addressModel")

const addAddress = async (req,res) => {
    try {
        const {addressType,name,city,landMark,state,pincode,phone,altPhone} = req.body
        const user = req.session.user

        const existingUser = await User.findOne({_id:user.id});
        const existingAddress = await Address.findOne({userId:existingUser._id})

        if(existingUser && !existingAddress) {
            const addAddress = new Address({
                userId : existingUser._id,
                addresses: [{
                    addressType:addressType,
                    name:name,
                    city:city,
                    landMark:landMark,
                    state:state,
                    pincode:pincode,
                    phone:phone,
                    altPhone:altPhone
                }]
            })

            await addAddress.save()
            res.status(200).json({success:true,message:"Address added successfully"})

        } else if(existingAddress && existingUser){
            await Address.updateOne(
                {userId:existingUser._id},
                { $push: { addresses : {
                    addressType:addressType,
                    name:name,
                    city:city,
                    landMark:landMark,
                    state:state,
                    pincode:pincode,
                    phone:phone,
                    altPhone:altPhone
                } }}
            )
            res.status(200).json({success:true,message:"Address added successfully"})

        } else {
            console.log("ititi");
            
            res.state(200).json({success:false,message:"Add address has some error"})
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({success:false,message:"An error occured. Please try again"});
    }
}

const editAddress = async (req,res) => {
    try {  
        const id = req.query.id;
        const user = req.session.user

        const existingUser = await User.findOne({_id:user.id})
        const existingAddress = await Address.findOne({userId:existingUser._id,addresses:{ $elemMatch: { _id: id }}})

        if(existingAddress) {
            for (let data of existingAddress.addresses) {
                if(data._id == id){
                   res.render('editAddress',{address:data , user})
                }
            }
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({success:false,message:"An error occured. Please try again"});
    }
}

const updateAddress = async (req,res) => {
    try {
        const id = req.params.id
        const user = req.session.user
        const {addressType,name,city,landMark,state,pincode,phone,altPhone} = req.body
        
        const existingUser = await User.findOne({_id:user.id});
        const existingAddress = await Address.findOne({userId:existingUser._id,addresses:{ $elemMatch: { _id: id }}})
        
        if (existingAddress) {
            await Address.updateOne(
                {_id:existingAddress,"addresses._id":id},
                {
                    $set:{
                        "addresses.$.addressType":addressType,
                        "addresses.$.name":name,
                        "addresses.$.city":city,
                        "addresses.$.landMark":landMark,
                        "addresses.$.state":state,
                        "addresses.$.pincode":pincode,
                        "addresses.$.phone":phone,
                        "addresses.$.altPhone":altPhone
                    }
                }
            )   
            res.status(200).json({success:true,message:"Address Updated Successfully"})
        } else {
            res.status(200).json({success:false,message:"Address Updated has error,Please try again"})
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({success:false,message:"An error occured. Please try again"});
    }
}


const deleteAddress = async (req,res) => {
    try {
        const id = req.body.id;
        const user = req.session.user;

        const existingUser = await User.findOne({_id:user.id});
        const existingAddress = await Address.findOne({userId:existingUser._id,"addresses._id" : id})

        if(existingAddress) {
            await Address.updateOne(
                {userId:existingUser._id},
                {$pull:{addresses:{_id:id}}}
            )
            res.status(200).json({ success: true, message: "Address is deleted successfully"});
        } else {
            res.status(200).json({success: false , message: "Address remove an error accured"})
        }
        
    } catch (error) {
        console.error(error);
        res.status(500).json({success:false,message:"An error occured. Please try again"});
    }
}


module.exports = {
    addAddress,
    editAddress,
    updateAddress,
    deleteAddress
}