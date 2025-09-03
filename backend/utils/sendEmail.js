const nodemailer = require("nodemailer");

const {
  NODE_ENV = "development",
  EMAIL_ZOHO,
  PASS_ZOHO
} = process.env;

function logOnly({ to, subject, text, html }) {
  console.log("📧 [DEV EMAIL LOG] →", { to, subject, text: text?.slice(0, 300) || "", html: html ? "[HTML body present]" : "" });
  return Promise.resolve();
}

module.exports = async function sendEmail({ to, subject, html, text }) {
  // If creds missing, log instead (non-prod). In prod, throw.
  if (!EMAIL_ZOHO || !PASS_ZOHO) {
    if (NODE_ENV !== "production") return logOnly({ to, subject, text, html });
    throw new Error("Missing EMAIL_ZOHO or PASS_ZOHO in production.");
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.zoho.eu",
    port: 465,
    secure: true,
    auth: { user: EMAIL_ZOHO, pass: PASS_ZOHO },
  });

  await transporter.sendMail({
    from: `"BundleBee 🔐" <${EMAIL_ZOHO}>`,
    to,
    subject,
    text,
    html,
  });
};
