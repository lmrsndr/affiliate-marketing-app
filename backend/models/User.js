const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserInteractionSchema = new mongoose.Schema(
  {
    action: { type: String, required: true },
    details: { type: mongoose.Schema.Types.Mixed, default: undefined },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const UserSchema = new mongoose.Schema(
  {
    email:        { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    name:         { type: String, required: true },
    displayName:  { type: String, trim: true, default: "" },
    bio:          { type: String, trim: true, default: "" },
    role:         { type: String, enum: ["user", "admin", "partner"], default: "user" },
    suspended:    { type: Boolean, default: false },

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
      enabled:        { type: Boolean, default: false },
      verified:       { type: Boolean, default: false },
      code:           { type: String, select: false },
      expiresAt:      { type: Date, select: false },
      failedAttempts: { type: Number, default: 0 },
      lastFailedAt:   { type: Date, default: null },
      lastSentAt:     { type: Date, default: null },
    },

    // Preferences
    notificationPreferences: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    appearance:              { type: mongoose.Schema.Types.Mixed, default: () => ({}) },

    // Legacy/session compatibility fields still written by active auth controllers.
    twoFAVerified: { type: Boolean, default: false },
    interactions:  { type: [UserInteractionSchema], default: () => [] },

    // Password reset
    resetToken:        { type: String, select: false },
    resetTokenExpires: { type: Date, select: false },
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
