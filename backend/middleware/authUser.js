const User = require("../models/User");

const USER_SELECT =
  "_id email role name profilePicture twoFA.enabled email2FA.enabled email2FA.verified";

function idFromClaims(claims = {}) {
  return claims.id || claims._id || claims.sub || null;
}

function toSafeUser(user, claims = {}) {
  if (!user) return null;

  const id = String(user._id || user.id || idFromClaims(claims));
  return {
    _id: id,
    id,
    email: user.email || claims.email,
    role: user.role || claims.role || "user",
    name: user.name,
    profilePicture: user.profilePicture,
    twoFA: {
      enabled: !!user.twoFA?.enabled,
    },
    email2FA: {
      enabled: !!user.email2FA?.enabled,
      verified: !!user.email2FA?.verified,
    },
    twoFAVerified: !!claims.mfaVerified,
  };
}

function userFromClaims(claims = {}) {
  const id = idFromClaims(claims);
  if (!id) return null;

  return {
    _id: String(id),
    id: String(id),
    email: claims.email,
    role: claims.role || "user",
    twoFA: {
      enabled: !!claims.twoFAEnabled,
    },
    email2FA: {
      enabled: !!claims.email2FAEnabled,
      verified: !!claims.email2FAVerified,
    },
    twoFAVerified: !!claims.mfaVerified,
  };
}

async function loadUserForClaims(claims = {}) {
  const id = idFromClaims(claims);
  if (!id) {
    return { user: null, found: false };
  }

  const user = await User.findById(id).select(USER_SELECT).lean();
  return {
    user: toSafeUser(user, claims),
    found: !!user,
  };
}

function setAuthState(req, user, claims = {}, source, options = {}) {
  const mfaVerified = !!claims.mfaVerified;
  const isAuthenticated =
    options.isAuthenticated !== undefined ? !!options.isAuthenticated : true;

  req.auth = Object.assign({}, req.auth, claims, {
    isAuthenticated,
    mfaVerified,
    claims,
    source,
  });

  if (user) {
    req.user = user;
  }

  return req.auth;
}

async function attachUserFromClaims(req, claims = {}, source, options = {}) {
  const loaded = await loadUserForClaims(claims);
  const user = loaded.user || userFromClaims(claims);

  setAuthState(req, user, claims, source, options);

  return {
    user,
    found: loaded.found,
  };
}

module.exports = {
  attachUserFromClaims,
  idFromClaims,
  loadUserForClaims,
  setAuthState,
  toSafeUser,
  userFromClaims,
};
