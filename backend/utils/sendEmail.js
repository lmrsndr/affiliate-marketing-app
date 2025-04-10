const nodemailer = require("nodemailer");

const sendEmail = async ({ to, subject, html }) => {
  if (!process.env.ZOHO_EMAIL || !process.env.ZOHO_PASSWORD) {
    throw new Error("Missing ZOHO_EMAIL or ZOHO_PASSWORD in .env");
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.zoho.eu", // use .eu, .com, or .in depending on your domain region
    port: 465,
    secure: true,
    auth: {
      user: process.env.ZOHO_EMAIL,
      pass: process.env.ZOHO_PASSWORD, // App-specific password if 2FA is enabled
    },
  });

  const mailOptions = {
    from: `"BundleBee 🔐" <${process.env.ZOHO_EMAIL}>`,
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
