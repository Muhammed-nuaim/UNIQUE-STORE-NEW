const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/userModel");
const env = require("dotenv").config();

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: 'https://unique.nuaim.tech/auth/google/callback'
},
async (accessToken, refreshToken, profile, done) => {
    try {
        // Check if a user with the googleId already exists
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
            // If the user exists, return the user
            return done(null, user);
        } else {
            // Create a new user if googleId is not found
            const newUser = new User({
                name: profile.displayName,
                email: profile.emails[0].value,
                googleId: profile.id || undefined 
            });

            // Save the new user to the database
            await newUser.save(); // Corrected typo: newUserer -> newUser
            return done(null, newUser);
        }
    } catch (error) {
        // Handle any error that occurred
        return done(error, null);
    }
}));

// Serialize user by their ID (used in session handling)
passport.serializeUser((user, done) => {
    done(null, user.id);
});

// Deserialize the user by looking them up in the database by ID
passport.deserializeUser((id, done) => {
    User.findById(id)
    .then(user => {
        done(null, user);
    })
    .catch(err => {
        done(err, null);
    });
});

module.exports = passport;
