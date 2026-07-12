const passport = require("passport");
const { Strategy: GoogleStrategy } = require("passport-google-oauth20");

const runtime = require("./runtime");
const User = require("../models/User");

passport.use(
  new GoogleStrategy(
    {
      clientID: runtime.googleClientId,
      clientSecret: runtime.googleClientSecret,
      callbackURL: runtime.googleRedirectUri,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) return done(new Error("Google account did not provide an email address"));

        let user = await User.findOne({ googleId: profile.id });
        if (!user) {
          user = await User.create({
            googleId: profile.id,
            email,
            name: profile.displayName,
            profilePicture: profile.photos?.[0]?.value || null,
            role: process.env.EMAIL_USER === email ? "admin" : "user",
            twoFAVerified: false,
          });
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
);

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    return done(null, user || false);
  } catch (error) {
    return done(error);
  }
});

module.exports = passport;
