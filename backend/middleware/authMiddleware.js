/**
 * Compatibility shim so routes that do:
 *   const {...} = require('../middleware/authMiddleware')
 * keep working after we split middlewares into separate files.
 */
module.exports = {
  // auth guards
  requireAuth: require('./requireAuth'),
  requireVerified2FA: require('./requireVerified2FA'),
  pending2FAOnly: require('./pending2FAOnly'),

  // roles
  roleMiddleware: require('./roleMiddleware'),

  // token/cookie attach + 2FA context
  attachUserIfPresent: require('./attachUserIfPresent'),
  otpOrRefreshMiddleware: require('./otpOrRefreshMiddleware'),
};
