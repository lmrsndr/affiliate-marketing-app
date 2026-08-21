const test = require("node:test");
const assert = require("node:assert/strict");

const {
  normaliseAwinRow,
  normaliseProgrammeName,
  parseAwinCsv,
  prepareAwinProgramme,
  scoreAwinProgramme,
} = require("../utils/awinAdvertiserImport");

const strongRow = {
  advertiserId: "106079",
  programmeName: "Pippa Small Jewellery (UK)",
  conversionRate: "5.95",
  approvalRate: "100.00",
  epc: "0.45",
  launchDate: "2025-01-01",
  paymentStatus: "green",
  paymentRiskLevel: "none",
  awinIndex: "70",
  feedEnabled: "yes",
  productReporting: "no",
  commissionMin: "10",
  commissionMax: "10",
  leadMin: "0",
  leadMax: "0",
  cookieLength: "30",
  parentSectors: "Retail & Shopping",
  subSectors: "Jewellery|Gifts & Flowers",
  primarySector: "Jewellery",
  averagePaymentTime: "30",
  primaryRegion: "GB",
  descriptionShort: "Handmade artisan jewellery with unique pieces.",
  logoUrl: "https://example.com/logo.png",
  displayUrl: "https://example.com",
};

test("normaliseAwinRow converts directory values into typed data", () => {
  const result = normaliseAwinRow(strongRow);
  assert.equal(result.advertiserId, "106079");
  assert.equal(result.conversionRate, 5.95);
  assert.equal(result.feedEnabled, true);
  assert.deepEqual(result.subSectors, ["Jewellery", "Gifts & Flowers"]);
  assert.equal(result.primaryRegion, "GB");
});

test("strong gift-led programmes receive a strong suggested fit", () => {
  const result = scoreAwinProgramme(normaliseAwinRow(strongRow));
  assert.equal(result.suggestedFit, "strong");
  assert.ok(result.prospectScore >= 60);
  assert.ok(result.fitReasons.includes("Jewellery"));
});

test("excluded programme sectors cannot be promoted by a high performance score", () => {
  const result = scoreAwinProgramme(normaliseAwinRow({
    ...strongRow,
    programmeName: "Fast Cars",
    primarySector: "Automotive",
    subSectors: "Automotive",
    descriptionShort: "High converting automotive programme",
  }));
  assert.equal(result.suggestedFit, "excluded");
  assert.ok(result.riskFlags.some((flag) => flag.startsWith("Excluded sector")));
});

test("programme preparation builds a publisher-specific Awin application URL", () => {
  const result = prepareAwinProgramme(strongRow, {
    publisherId: "3048673",
    importedAt: new Date("2026-08-21T00:00:00.000Z"),
  });
  assert.equal(result.applicationUrl, "https://ui.awin.com/awin/affiliate/3048673/merchant-profile/106079");
  assert.equal(result.commissionType, "percentage");
  assert.equal(result.commissionValue, 10);
  assert.equal(result.reviewDecision, undefined);
});

test("programme name matching ignores punctuation", () => {
  assert.equal(
    normaliseProgrammeName("Pippa Small Jewellery (UK)"),
    normaliseProgrammeName("Pippa Small Jewellery UK")
  );
});

test("CSV parser rejects exports without the required Awin columns", async () => {
  await assert.rejects(
    parseAwinCsv("advertiserId,programmeName\n1,Example"),
    /missing required columns/
  );
});

test("CSV parser preserves quoted commas and line breaks", async () => {
  const rows = await parseAwinCsv([
    "advertiserId,programmeName,paymentStatus,primaryRegion,primarySector,descriptionShort",
    '1,"Made, Slowly",green,GB,Jewellery,"A thoughtful, handmade\ncollection"',
  ].join("\n"));
  assert.equal(rows[0].programmeName, "Made, Slowly");
  assert.equal(rows[0].descriptionShort, "A thoughtful, handmade\ncollection");
});
