const PDFDocument = require("pdfkit");
const { PassThrough } = require("stream");
const getStream = require("get-stream");

/**
 * Generates a PDF invoice and returns it as a Buffer
 * @param {Object} txn - Transaction document from MongoDB
 * @param {Object} partner - Populated partner user object
 * @returns {Promise<Buffer>} PDF file buffer
 */
async function generateInvoicePDF(txn, partner) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const stream = new PassThrough();

      doc.pipe(stream);

      // Header
      doc.fontSize(20).text("INVOICE", { align: "center" });
      doc.moveDown();

      // Invoice Info
      doc.fontSize(12).text(`Invoice ID: ${txn._id}`);
      doc.text(`Date: ${new Date(txn.date).toLocaleDateString()}`);
      doc.text(`Partner: ${partner?.name || "N/A"}`);
      doc.text(`Email: ${partner?.email || "N/A"}`);
      doc.moveDown();

      // Item
      doc.fontSize(14).text("Description", { underline: true });
      doc.moveDown(0.5);
      doc.text(`${txn.category} (${txn.type})`, { continued: true });
      doc.text(` - £${txn.amount.toFixed(2)} ${txn.currency}`, { align: "right" });
      doc.moveDown();

      // VAT (if applicable)
      if (txn.vatIncluded) {
        const vat = txn.amount * 0.2;
        const net = txn.amount - vat;
        doc.text(`Subtotal: £${net.toFixed(2)}`);
        doc.text(`VAT (20%): £${vat.toFixed(2)}`);
      }

      doc.moveDown();
      doc.fontSize(16).text(`Total: £${txn.amount.toFixed(2)}`, { bold: true });

      // Footer
      doc.moveDown(4);
      doc.fontSize(10).text("This is a system-generated invoice for your records.", {
        align: "center",
        oblique: true
      });

      doc.end();

      const pdfBuffer = await getStream.buffer(stream);
      resolve(pdfBuffer);
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = generateInvoicePDF;
