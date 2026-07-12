const test = require("node:test");
const assert = require("node:assert/strict");

const {
  cleanStringList,
  isSafePublicUrl,
  normaliseSlug,
  validateShoppingPayload,
} = require("../utils/validation");

test("normaliseSlug creates stable lowercase slugs", () => {
  assert.equal(normaliseSlug("  Gifts for Teenagers!  "), "gifts-for-teenagers");
});

test("cleanStringList trims and removes duplicates", () => {
  assert.deepEqual(cleanStringList([" gift ", "gift", "tech", ""]), ["gift", "tech"]);
});

test("isSafePublicUrl accepts public HTTPS URLs", () => {
  assert.equal(isSafePublicUrl("https://example.com/product?id=10", { required: true }), true);
});

test("isSafePublicUrl rejects unsafe and private destinations", () => {
  assert.equal(isSafePublicUrl("javascript:alert(1)", { required: true }), false);
  assert.equal(isSafePublicUrl("http://localhost:3000/private", { required: true }), false);
  assert.equal(isSafePublicUrl("http://127.0.0.1/private", { required: true }), false);
});

test("product validation requires public product, affiliate and image URLs", () => {
  const errors = validateShoppingPayload("product", {
    name: "Test product",
    slug: "test-product",
    brand: "507f1f77bcf86cd799439011",
    shortDescription: "A test product",
    productUrl: "https://example.com/product",
    affiliateUrl: "javascript:alert(1)",
    imageUrl: "https://example.com/image.jpg",
    price: 10,
  });

  assert.ok(errors.some((error) => error.includes("affiliateUrl")));
});

test("valid product input passes validation", () => {
  const errors = validateShoppingPayload("product", {
    name: "Test product",
    slug: "test-product",
    brand: "507f1f77bcf86cd799439011",
    shortDescription: "A test product",
    productUrl: "https://example.com/product",
    affiliateUrl: "https://example.com/affiliate/product",
    imageUrl: "https://example.com/image.jpg",
    price: 10,
  });

  assert.deepEqual(errors, []);
});
