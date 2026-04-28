const mongoose = require("mongoose");
const logger = require("../logger");
require("dotenv").config(); // Load environment variables

const uri = process.env.MONGO_URI;

console.log("🔍 DEBUG: MONGO_URI =", uri ? "Loaded from environment" : "❌ MONGO_URI is missing!");

if (!uri) {
  console.error("❌ ERROR: MONGO_URI is not set. Check your environment variables.");
  process.exit(1);
}

if (process.env.NODE_ENV !== "production") {
  mongoose.set('debug', (collection, method, query) => {
      logger.info(`MongoDB Query - Collection: ${collection}, Method: ${method}, Query: ${JSON.stringify(query)}`);
  });
}

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) {
    console.log("✅ MongoDB is already connected.");
    return;
  }

  try {
    await mongoose.connect(uri, {
      dbName: "bundlebee",
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    logger.info("✅ MongoDB Connected to bundlebee...");
    console.log("⚠️ FLE is NOT enabled (M0 Free Tier does not support it).");
  } catch (err) {
    logger.error(`❌ MongoDB connection error: ${err.message}`);
    console.error("❌ MongoDB Connection Error:", err);
    process.exit(1);
  }
};

module.exports = connectDB;
