const nodemailer = require("nodemailer");

const sendEmail = async ({ to, subject, html }) => {
  if (!process.env.EMAIL_ZOHO || !process.env.PASS_ZOHO) {
    throw new Error("Missing EMAIL_ZOHO or PASS_ZOHO in environment variables.");
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.zoho.eu",
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_ZOHO,
      pass: process.env.PASS_ZOHO, // ✅ Corrected to use the right password
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
