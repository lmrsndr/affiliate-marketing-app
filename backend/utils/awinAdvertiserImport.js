const REQUIRED_HEADERS = new Set([
  "advertiserId",
  "programmeName",
  "paymentStatus",
  "primaryRegion",
  "primarySector",
]);

const PRIMARY_SECTOR_SCORES = new Map([
  ["Gifts & Flowers", 30],
  ["Jewellery", 30],
  ["Home & Garden", 22],
  ["Photos & Print Services", 22],
  ["Office Supplies", 18],
  ["Books & Subscriptions", 18],
  ["Toys & Games", 16],
  ["Furniture & Soft Furnishings", 16],
  ["Green (Eco friendly)", 16],
  ["Pets & Pet Care", 14],
  ["Baby & Toddler", 12],
  ["FMCG", 12],
  ["Wine, Spirits & Tobacco", 10],
  ["Tourism & Attractions", 10],
  ["Health & Beauty", 8],
  ["Clothing Accessories", 8],
  ["Childrenswear", 8],
  ["Sports Equipment", 5],
  ["Clothing", 3],
  ["Womenswear", 3],
  ["Menswear", 3],
  ["Shoes", 2],
]);

const EXCLUDED_PRIMARY_SECTORS = new Set([
  "Automotive",
  "Utilities",
  "Network Operators",
  "Insurance",
  "Web Hosting",
  "Mobile Pay As You Go",
  "Pharmaceuticals",
  "Electronic Superstore",
  "White Goods",
  "Business Services (B2B)",
]);

const EXCLUDED_SECTORS = new Set(["Gambling & Competitions", "Erotic"]);

const POSITIVE_KEYWORDS = new Map([
  ["handmade", 10],
  ["hand-crafted", 10],
  ["handcrafted", 10],
  ["artisan", 10],
  ["personalised", 8],
  ["personalized", 8],
  ["bespoke", 7],
  ["independent", 7],
  ["family-run", 7],
  ["family run", 7],
  ["made in", 7],
  ["small business", 7],
  ["custom", 5],
  ["designed in", 5],
  ["collector", 5],
  ["craft", 5],
  ["british", 4],
  ["studio", 4],
  ["unique", 3],
  ["original", 3],
  ["gift", 3],
  ["luxury", 2],
]);

const NEGATIVE_KEYWORDS = new Map([
  ["global marketplace", -20],
  ["marketplace", -20],
  ["department store", -12],
  ["pharmaceutical", -10],
  ["supplement", -8],
  ["more than 12,000", -8],
  ["over 30,000", -8],
  ["thousands of products", -8],
  ["lowest prices", -8],
  ["low prices", -6],
]);

function cleanText(value) {
  return String(value ?? "").trim();
}

function parseNumber(value) {
  const text = cleanText(value);
  if (!text || text.toLowerCase() === "null") return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

function parseDate(value) {
  const text = cleanText(value);
  if (!text) return null;
  const date = new Date(`${text}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseYesNo(value) {
  return cleanText(value).toLowerCase() === "yes";
}

function splitList(value) {
  return [...new Set(cleanText(value).split("|").map((item) => item.trim()).filter(Boolean))];
}

function normaliseProgrammeName(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\bprogramme\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseCsvRecords(csvText) {
  const text = String(csvText || "").replace(/^\uFEFF/, "");
  const records = [];
  let record = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"' && field === "") {
      quoted = true;
    } else if (character === ",") {
      record.push(field.trim());
      field = "";
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      record.push(field.trim());
      if (record.some(Boolean)) records.push(record);
      record = [];
      field = "";
    } else {
      field += character;
    }
  }

  record.push(field.trim());
  if (record.some(Boolean)) records.push(record);
  if (quoted) throw new Error("The Awin CSV contains an unfinished quoted field");
  return records;
}

async function parseAwinCsv(csvText) {
  const records = parseCsvRecords(csvText);
  const headers = records.shift() || [];
  const missing = [...REQUIRED_HEADERS].filter((header) => !headers.includes(header));
  if (missing.length) {
    throw new Error(`The Awin CSV is missing required columns: ${missing.join(", ")}`);
  }
  if (records.length > 5000) throw new Error("The Awin CSV contains more than 5,000 advertisers");

  return records.map((values) => Object.fromEntries(
    headers.map((header, index) => [header, values[index] || ""])
  ));
}

function normaliseAwinRow(row) {
  const advertiserId = cleanText(row.advertiserId);
  const programmeName = cleanText(row.programmeName);
  if (!advertiserId || !programmeName) return null;

  return {
    advertiserId,
    programmeName,
    conversionRate: parseNumber(row.conversionRate),
    approvalRate: parseNumber(row.approvalRate),
    epc: parseNumber(row.epc),
    launchDate: parseDate(row.launchDate),
    paymentStatus: cleanText(row.paymentStatus).toLowerCase() || "unknown",
    paymentRiskLevel: cleanText(row.paymentRiskLevel).toLowerCase() || "unknown",
    awinIndex: parseNumber(row.awinIndex),
    feedEnabled: parseYesNo(row.feedEnabled),
    productReporting: parseYesNo(row.productReporting),
    commissionMin: parseNumber(row.commissionMin),
    commissionMax: parseNumber(row.commissionMax),
    leadMin: parseNumber(row.leadMin),
    leadMax: parseNumber(row.leadMax),
    cookieLengthDays: parseNumber(row.cookieLength),
    parentSectors: splitList(row.parentSectors),
    subSectors: splitList(row.subSectors),
    primarySector: cleanText(row.primarySector),
    averagePaymentTimeDays: parseNumber(row.averagePaymentTime),
    primaryRegion: cleanText(row.primaryRegion).toUpperCase(),
    descriptionShort: cleanText(row.descriptionShort),
    logoUrl: cleanText(row.logoUrl),
    displayUrl: cleanText(row.displayUrl),
  };
}

function scoreAwinProgramme(programme) {
  const reasons = [];
  const riskFlags = [];
  const sectorSet = new Set(programme.subSectors);
  const text = `${programme.programmeName} ${programme.descriptionShort}`.toLowerCase();
  const primaryScore = PRIMARY_SECTOR_SCORES.get(programme.primarySector) || 0;
  let score = primaryScore;

  if (primaryScore) reasons.push(programme.primarySector);

  const relatedSectorScore = Math.max(
    0,
    ...programme.subSectors
      .filter((sector) => sector !== programme.primarySector)
      .map((sector) => PRIMARY_SECTOR_SCORES.get(sector) || 0)
  );
  if (relatedSectorScore >= 18) {
    score += Math.min(8, Math.floor(relatedSectorScore / 4));
    reasons.push("Related gift sector");
  }

  const excludedSector = [...EXCLUDED_SECTORS].find((sector) => sectorSet.has(sector));
  const hardExcluded = EXCLUDED_PRIMARY_SECTORS.has(programme.primarySector) || Boolean(excludedSector);
  if (hardExcluded) riskFlags.push(`Excluded sector: ${excludedSector || programme.primarySector}`);

  let keywordScore = 0;
  for (const [keyword, points] of POSITIVE_KEYWORDS) {
    if (text.includes(keyword)) {
      keywordScore += points;
      if (reasons.length < 5) reasons.push(keyword);
    }
  }
  score += Math.min(keywordScore, 22);

  for (const [keyword, points] of NEGATIVE_KEYWORDS) {
    if (text.includes(keyword)) {
      score += points;
      riskFlags.push(keyword);
    }
  }

  if (programme.paymentStatus === "green") score += 10;
  else {
    score -= 40;
    riskFlags.push(`Payment status: ${programme.paymentStatus}`);
  }

  if (programme.paymentRiskLevel === "none") score += 5;
  else {
    score -= 15;
    riskFlags.push(`Payment risk: ${programme.paymentRiskLevel}`);
  }

  let performanceScore = 0;
  if (programme.approvalRate !== null) {
    if (programme.approvalRate >= 90) performanceScore += 7;
    else if (programme.approvalRate >= 70) performanceScore += 4;
    else if (programme.approvalRate < 50) performanceScore -= 8;
  }
  if (programme.conversionRate !== null) {
    if (programme.conversionRate >= 5) performanceScore += 5;
    else if (programme.conversionRate >= 2) performanceScore += 2;
  }
  if (programme.epc !== null) {
    if (programme.epc >= 0.2) performanceScore += 5;
    else if (programme.epc >= 0.05) performanceScore += 2;
  }
  if (programme.awinIndex !== null && programme.awinIndex >= 60) performanceScore += 4;
  if (programme.cookieLengthDays !== null) {
    if (programme.cookieLengthDays >= 30) performanceScore += 3;
    else if (programme.cookieLengthDays < 14) performanceScore -= 5;
  }
  score += Math.min(performanceScore, 20);
  if (programme.feedEnabled) score += 2;

  const targeted = primaryScore >= 12 || keywordScore > 0;
  const boundedScore = Math.min(100, Math.max(0, Math.round(score)));
  let suggestedFit = "excluded";
  if (!hardExcluded && boundedScore >= 60 && targeted) suggestedFit = "strong";
  else if (!hardExcluded && boundedScore >= 40) suggestedFit = "possible";
  else if (!hardExcluded && boundedScore >= 25) suggestedFit = "weak";

  return {
    prospectScore: boundedScore,
    suggestedFit,
    fitReasons: [...new Set(reasons)].slice(0, 5),
    riskFlags: [...new Set(riskFlags)].slice(0, 5),
  };
}

function programmeApplicationUrl(publisherId, advertiserId) {
  const cleanPublisherId = cleanText(publisherId);
  if (!/^\d+$/.test(cleanPublisherId)) return "";
  return `https://ui.awin.com/awin/affiliate/${cleanPublisherId}/merchant-profile/${advertiserId}`;
}

function prepareAwinProgramme(row, { publisherId = "", importedAt = new Date() } = {}) {
  const programme = normaliseAwinRow(row);
  if (!programme) return null;
  const scoring = scoreAwinProgramme(programme);

  return {
    name: programme.programmeName,
    network: "AWIN",
    source: "awin-directory",
    applicationUrl: programmeApplicationUrl(publisherId, programme.advertiserId),
    status: "researching",
    commissionType:
      programme.leadMax > 0 && programme.commissionMax > 0
        ? "mixed"
        : programme.commissionMax > 0
          ? "percentage"
          : programme.leadMax > 0
            ? "fixed"
            : "unknown",
    commissionValue:
      programme.commissionMin !== null && programme.commissionMin === programme.commissionMax
        ? programme.commissionMax
        : null,
    cookieDurationDays: programme.cookieLengthDays,
    ...scoring,
    awin: { ...programme, importedAt },
  };
}

module.exports = {
  normaliseAwinRow,
  normaliseProgrammeName,
  parseAwinCsv,
  prepareAwinProgramme,
  scoreAwinProgramme,
};
