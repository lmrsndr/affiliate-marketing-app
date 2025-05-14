const nodemailer = require("nodemailer");

const sendEmail = async ({ to, subject, html }) => {
  if (!process.env.EMAIL_ZOHO || !process.env.EMAIL_USER) {
    throw new Error("Missing EMAIL_ZOHO or EMAIL_USER in .env");
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.zoho.eu", // Confirm your Zoho region
    port: 465,
    secure: process.env.EMAIL_SECURE === "true",
    auth: {
      user: process.env.EMAIL_ZOHO,
      pass: process.env.EMAIL_USER, // App-specific password if 2FA is enabled
    },
  });

  const mailOptions = {
    from: `"BundleBee 🔐" <${process.env.EMAIL_ZOHO}>`,
    to,
    subject,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("📧 Email sent:", info.response);
  } catch (err) {
    console.error("❌ Failed to send email:", err);
    throw err;
  }
};

module.exports = sendEmail;
