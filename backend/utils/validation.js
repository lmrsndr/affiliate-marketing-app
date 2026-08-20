const SAFE_PROTOCOLS = new Set(["http:", "https:"]);

function isSafePublicUrl(value, { required = false } = {}) {
  if (value === null || value === undefined || value === "") return !required;

  try {
    const url = new URL(String(value));
    if (!SAFE_PROTOCOLS.has(url.protocol)) return false;
    if (!url.hostname || url.username || url.password) return false;

    const hostname = url.hostname.toLowerCase();
    if (
      hostname === "localhost" ||
      hostname.endsWith(".local") ||
      hostname === "0.0.0.0" ||
      hostname === "127.0.0.1" ||
      hostname === "::1"
    ) {
      return false;
    }

    return true;
  } catch (_error) {
    return false;
  }
}

function cleanStringList(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => String(item).trim()).filter(Boolean))];
}

function normaliseSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function validateShoppingPayload(kind, payload) {
  const errors = [];

  const requireText = (field, label = field) => {
    if (!String(payload[field] || "").trim()) errors.push(`${label} is required`);
  };

  if (kind === "product") {
    requireText("name", "Product name");
    requireText("slug", "Slug");
    requireText("brand", "Brand");
    requireText("shortDescription", "Short description");

    if (!isSafePublicUrl(payload.productUrl, { required: true })) {
      errors.push("productUrl must be a valid public HTTP or HTTPS URL");
    }

    const publishing = Boolean(payload.publishedAt);
    for (const field of ["affiliateUrl", "imageUrl"]) {
      if (!isSafePublicUrl(payload[field], { required: publishing })) {
        errors.push(`${field} must be a valid public HTTP or HTTPS URL`);
      }
    }

    if (payload.price !== null && payload.price !== undefined && Number(payload.price) < 0) {
      errors.push("Price cannot be negative");
    }
  }

  if (kind === "brand") {
    requireText("name", "Brand name");
    requireText("slug", "Slug");
    if (!isSafePublicUrl(payload.website, { required: true })) {
      errors.push("Website must be a valid public HTTP or HTTPS URL");
    }
    if (payload.logoUrl && !isSafePublicUrl(payload.logoUrl)) {
      errors.push("Logo URL must be a valid public HTTP or HTTPS URL");
    }
    if (payload.heroImageUrl && !isSafePublicUrl(payload.heroImageUrl)) {
      errors.push("Hero image URL must be a valid public HTTP or HTTPS URL");
    }
    if (!isSafePublicUrl(payload.affiliateUrl, { required: Boolean(payload.publishedAt) })) {
      errors.push("Affiliate URL must be a valid public HTTP or HTTPS URL");
    }
    for (const url of payload.galleryImages || []) {
      if (!isSafePublicUrl(url)) errors.push("Gallery images must use valid public HTTP or HTTPS URLs");
    }
  }

  if (kind === "collection") {
    requireText("name", "Collection name");
    requireText("slug", "Slug");
    if (payload.imageUrl && !isSafePublicUrl(payload.imageUrl)) {
      errors.push("Image URL must be a valid public HTTP or HTTPS URL");
    }
  }

  if (kind === "programme") {
    requireText("name", "Programme name");
    requireText("network", "Network");
    for (const field of ["applicationUrl", "dashboardUrl", "termsUrl"]) {
      if (payload[field] && !isSafePublicUrl(payload[field])) {
        errors.push(`${field} must be a valid public HTTP or HTTPS URL`);
      }
    }
  }

  return errors;
}

module.exports = {
  cleanStringList,
  isSafePublicUrl,
  normaliseSlug,
  validateShoppingPayload,
};
