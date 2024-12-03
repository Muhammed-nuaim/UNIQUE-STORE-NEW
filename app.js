const express = require("express");
const app = express();
const session = require("express-session")
const path = require("path")
const env = require("dotenv").config();
const db = require("./config/db");
const passport = require("./config/passport")
const flash = require("connect-flash")

db();
app.use(express.static("public"))

app.use((req,res,next) => {
    res.set('cache-control','no-store')
    next();
})

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret:process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie:{
        secure: true,
        httpOnly: true,
        maxAge: 72*60*60*1000
    }
}))

app.use(passport.initialize())
app.use(passport.session())

app.use(flash());
 app.use((req, res, next) => {
   res.locals.successMessage = req.flash('success');
   res.locals.errorMessage = req.flash('error');
    next();
});

const userRouter = require("./routes/userRouter");
const adminRouter = require("./routes/adminRouter");

app.set('view engine', 'ejs');  
app.set('views',[path.join(__dirname,'views/User'),path.join(__dirname,'views/Admin')]);

app.use('/',userRouter);
app.use('/admin',adminRouter);


app.listen(process.env.PORT, () => {
    console.log("http://localhost:3000");
});
module.exports = app;