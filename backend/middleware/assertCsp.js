// backend/middleware/assertCsp.js
// Middleware to verify every response includes a CSP header.
// Logs an error in non-test environments if CSP is missing.

const assertCsp = (nodeEnv = process.env.NODE_ENV) => {
  return (req, res, next) => {
    res.on("finish", () => {
      const hasCsp = res.getHeader("content-security-policy");
      if (!hasCsp && nodeEnv !== "test") {
        console.error("❌ Missing CSP header on", req.method, req.originalUrl);
      }
    });
    next();
  };
};

module.exports = assertCsp;
