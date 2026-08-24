const assert = require("node:assert/strict");
const test = require("node:test");

const {
  canPreviewProgramme,
  createPreviewToken,
  isPreviewToken,
} = require("../utils/partnerPreview");

test("preview tokens are opaque and valid", () => {
  const first = createPreviewToken();
  const second = createPreviewToken();
  assert.equal(first.length, 48);
  assert.match(first, /^[a-f0-9]+$/);
  assert.notEqual(first, second);
  assert.equal(isPreviewToken(first), true);
  assert.equal(isPreviewToken("not-a-token"), false);
});

test("only active applied programmes that the owner has not rejected can be previewed", () => {
  assert.equal(canPreviewProgramme({ status: "applied", reviewDecision: "shortlisted" }), true);
  assert.equal(canPreviewProgramme({ status: "applied", reviewDecision: "unreviewed", active: true }), true);
  assert.equal(canPreviewProgramme({ status: "applied", reviewDecision: "rejected" }), false);
  assert.equal(canPreviewProgramme({ status: "researching", reviewDecision: "shortlisted" }), false);
  assert.equal(canPreviewProgramme({ status: "approved", reviewDecision: "shortlisted" }), false);
  assert.equal(canPreviewProgramme({ status: "applied", reviewDecision: "shortlisted", active: false }), false);
});

