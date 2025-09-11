const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema(
  {
    email:        { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    name:         { type: String, required: true },
    role:         { type: String, enum: ["user", "admin", "partner"], default: "user" },

    // Local auth
    password:     { type: String, select: false }, // bcrypt hash stored here
    localEnabled: { type: Boolean, default: true },

    // Google
    googleId:       { type: String, unique: true, sparse: true },
    profilePicture: { type: String },

    // 2FA
    twoFA: {
      enabled:     { type: Boolean, default: false },
      secret:      { type: String, select: false },
      backupCodes: [{ type: String, select: false }],
    },
    email2FA: {
      enabled:  { type: Boolean, default: false },
      verified: { type: Boolean, default: false },
      code:     { type: String, select: false },
      expiresAt:{ type: Date,   select: false },
    },
  },
  { timestamps: true }
);

// Hash if password changed (safe; won't rehash unless modified)
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next();
  if (!this.password.startsWith("$2")) { // simple guard to avoid double-hash if caller already hashed
    this.password = await bcrypt.hash(this.password, 12);
  }
  next();
});

module.exports = mongoose.models.User || mongoose.model("User", UserSchema);
