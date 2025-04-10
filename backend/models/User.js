const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: false, select: false },
  googleId: { type: String, unique: true, sparse: true },
  role: { type: String, enum: ["user", "admin", "partner"], default: "user" },
  enabledViews: { type: Array, default: ["questionnaire"] },

  interactions: [
    {
      action: String,
      details: mongoose.Schema.Types.Mixed,
      timestamp: { type: Date, default: Date.now },
    },
  ],

  // ✅ App-based 2FA
  twoFA: {
    enabled: { type: Boolean, default: false },
    secret: { type: String }, // Base32 TOTP secret
    backupCodes: [{ type: String }],
  },

  // ✅ Email-based 2FA
  email2FA: {
    code: { type: String },
    expiresAt: { type: Date },
    verified: { type: Boolean, default: false },
  },

  createdAt: { type: Date, default: Date.now },
});

// ✅ Indexes
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ googleId: 1 }, { unique: true, sparse: true });

// ✅ Hash password before saving
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// ✅ Compare password method
UserSchema.methods.comparePassword = async function (password) {
  if (!this.password) return false;
  return bcrypt.compare(password, this.password);
};

module.exports = mongoose.models.User || mongoose.model("User", UserSchema);
