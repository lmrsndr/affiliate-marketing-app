const dotenv = require("dotenv");

// Load environment variables from .env file
dotenv.config();

module.exports = {
  MONGO_URI: process.env.MONGO_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  PORT: process.env.PORT || 5000,
};
