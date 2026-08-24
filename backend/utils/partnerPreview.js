const crypto = require("crypto");

function createPreviewToken() {
  return crypto.randomBytes(24).toString("hex");
}

function isPreviewToken(value) {
  return /^[a-f0-9]{48}$/.test(String(value || "").trim().toLowerCase());
}

function canPreviewProgramme(programme) {
  return programme?.active !== false
    && programme?.status === "applied"
    && programme?.reviewDecision !== "rejected";
}

module.exports = { canPreviewProgramme, createPreviewToken, isPreviewToken };

