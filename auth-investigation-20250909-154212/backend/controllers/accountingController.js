const Transaction = require("../models/Transaction");
const Expense = require("../models/Expense");
const generateInvoicePDF = require("../utils/invoiceGenerator");
const uploadToS3 = require("../utils/s3Uploader");
const sendEmail = require("../utils/sendEmail");
const { Parser } = require("json2csv");
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

// ─────────────────────────────
// GET: All accounting data
// ─────────────────────────────
exports.getReport = async (req, res) => {
  try {
    const revenue = await Transaction.find({ type: "subscription" });
    const expenses = await Expense.find();
    res.json({ revenue, expenses });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch accounting data" });
  }
};

// ─────────────────────────────
// POST: Add a manual transaction
// ─────────────────────────────
exports.addTransaction = async (req, res) => {
  try {
    const txn = new Transaction(req.body);
    await txn.save();
    res.json({ success: true, txn });
  } catch (err) {
    res.status(400).json({ error: "Invalid transaction data" });
  }
};

// ─────────────────────────────
// POST: Upload Expense Receipt to S3
// ─────────────────────────────
exports.uploadExpense = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const buffer = req.file.buffer;
    const originalName = req.file.originalname;
    const mimeType = req.file.mimetype;

    const s3Url = await uploadToS3(buffer, originalName, "expenses", mimeType);

    const newExpense = new Expense({
      ...req.body,
      fileUrl: s3Url,
      uploadedBy: req.user?._id || null,
      fileAvailable: true
    });

    await newExpense.save();
    res.json({ success: true, expense: newExpense });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Expense upload failed" });
  }
};

// ─────────────────────────────
// PUT: Reupload missing expense file
// ─────────────────────────────
exports.reuploadExpenseFile = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ error: "Expense not found" });
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const buffer = req.file.buffer;
    const originalName = req.file.originalname;
    const mimeType = req.file.mimetype;

    const s3Url = await uploadToS3(buffer, originalName, "expenses", mimeType);

    expense.fileUrl = s3Url;
    expense.fileAvailable = true;
    await expense.save();

    res.json({ success: true, fileUrl: s3Url });
  } catch (err) {
    console.error("❌ Reupload failed:", err);
    res.status(500).json({ error: "Reupload failed" });
  }
};

// ─────────────────────────────
// GET: Generate and return invoice signed URL + email it to partner
// ─────────────────────────────
exports.getInvoice = async (req, res) => {
  try {
    const txn = await Transaction.findById(req.params.txnId).populate("partnerId");
    if (!txn) return res.status(404).send("Transaction not found");

    const pdfBuffer = await generateInvoicePDF(txn, txn.partnerId);
    const signedUrl = await uploadToS3(pdfBuffer, `invoice-${txn._id}.pdf`, "invoices", "application/pdf");

    txn.invoiceUrl = signedUrl;
    txn.fileAvailable = true;
    await txn.save();

    if (txn.partnerId?.email) {
      await sendEmail({
        to: txn.partnerId.email,
        subject: "🧾 Your New Invoice from BundleBee",
        html: `
          <p>Hi ${txn.partnerId.name || ""},</p>
          <p>Your invoice for £${txn.amount} has been generated.</p>
          <p><a href="${signedUrl}" target="_blank">Click here to view/download your invoice</a></p>
        `,
      });
    }

    res.status(200).json({ url: signedUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Invoice generation failed" });
  }
};

// ─────────────────────────────
// GET: Partner can view their invoices
// ─────────────────────────────
exports.getPartnerInvoices = async (req, res) => {
  try {
    const invoices = await Transaction.find({
      partnerId: req.user._id,
      type: "subscription",
      invoiceUrl: { $exists: true }
    });

    res.status(200).json({ invoices });
  } catch (err) {
    console.error("❌ Failed to fetch partner invoices:", err);
    res.status(500).json({ message: "Failed to fetch invoices" });
  }
};

// ─────────────────────────────
// GET: Download revenue + expenses as CSV
// ─────────────────────────────
exports.exportCSV = async (req, res) => {
  try {
    const revenue = await Transaction.find();
    const expenses = await Expense.find();

    const fields = [
      "type", "category", "amount", "currency", "date", "vendor", "notes", "referenceId"
    ];

    const combined = [
      ...revenue.map(r => ({
        type: "revenue",
        category: r.category,
        amount: r.amount,
        currency: r.currency,
        date: r.date,
        vendor: "",
        notes: "",
        referenceId: r.referenceId
      })),
      ...expenses.map(e => ({
        type: "expense",
        category: e.category,
        amount: e.amount,
        currency: e.currency,
        date: e.date,
        vendor: e.vendor,
        notes: e.notes,
        referenceId: ""
      }))
    ];

    const parser = new Parser({ fields });
    const csv = parser.parse(combined);

    res.header("Content-Type", "text/csv");
    res.attachment("bundlebee-accounting.csv");
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).send("CSV export failed");
  }
};

// ─────────────────────────────
// GET: Generate secure S3 signed URL
// ─────────────────────────────
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

exports.getSignedS3Url = async (req, res) => {
  const { key } = req.query;
  if (!key) return res.status(400).json({ error: "Missing file key" });

  try {
    const bucket = process.env.AWS_S3_BUCKET_NAME;
    const keyMatch = key.match(new RegExp(`${bucket}\\.s3\\.${process.env.AWS_REGION}\\.amazonaws\\.com/(.+)$`));
    const objectKey = keyMatch?.[1] || key;

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: objectKey
    });

    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
    res.json({ url: signedUrl });
  } catch (err) {
    console.error("❌ Failed to generate signed S3 URL:", err);
    res.status(500).json({ error: "Failed to generate signed URL" });
  }
};
