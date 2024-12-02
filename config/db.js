const dotenv = require("dotenv");
dotenv.config();
const mongoose = require("mongoose");

const MONGODB_URI = process.env.MONGODB_URI;

console.log(process.env.PORT);

const connectDB = async () => {
    try{
       const connect = await mongoose.connect(MONGODB_URI);
       console.log("DB Connected")
    } catch (error){
        console.log(error.message);
    }
}

module.exports = connectDB