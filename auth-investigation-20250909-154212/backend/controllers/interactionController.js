const Interaction = require("../models/Interaction");
const { Parser } = require("json2csv");

// ✅ Log User Interaction
async function logInteraction(req, res) {
  try {
    const { action, details } = req.body;

    if (!action || typeof action !== "string") {
      return res.status(400).json({ message: "Missing or invalid action" });
    }

    const interaction = new Interaction({
      userId: req.user?.id || null,
      action,
      details,
      userAgent: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    await interaction.save();
    res.status(201).json({ message: "Interaction logged" });
  } catch (error) {
    console.error("❌ Failed to log interaction:", error);
    res.status(500).json({ message: "Server error" });
  }
}

// ✅ Export Interactions to CSV (Admin Only)
async function exportInteractionsCSV(req, res) {
  try {
    const interactions = await Interaction.find().populate("userId", "email name").lean();

    const fields = [
      { label: "User", value: (row) => row.userId?.email || "Guest" },
      { label: "Action", value: "action" },
      { label: "Details", value: (row) => JSON.stringify(row.details) },
      { label: "User Agent", value: "userAgent" },
      { label: "IP Address", value: "ipAddress" },
      { label: "Date", value: (row) => new Date(row.createdAt).toLocaleString() },
    ];

    const parser = new Parser({ fields });
    const csv = parser.parse(interactions);

    res.header("Content-Type", "text/csv");
    res.attachment("interactions.csv");
    res.send(csv);
  } catch (error) {
    console.error("❌ Failed to export interactions:", error);
    res.status(500).json({ message: "CSV export failed" });
  }
}

module.exports = {
  logInteraction,
  exportInteractionsCSV,
};
