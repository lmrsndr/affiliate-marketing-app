const LRU = require("lru-cache");
const User = require("../models/User");

const cache = new LRU({
  max: 500,
  ttl: 60 * 1000, // 60s
});

// In-flight de-duplication: key => Promise
const inflight = new Map();

function keyFor(userId, projection) {
  return JSON.stringify({ userId, projection: projection || {} });
}

/**
 * Fetch a user by id with TTL cache and in-flight de-duplication.
 * Always returns a plain object via .lean().
 */
async function getUserById(userId, { projection } = {}) {
  if (!userId) return null;

  const k = keyFor(userId, projection);

  if (cache.has(k)) return cache.get(k);
  if (inflight.has(k)) return inflight.get(k);

  const p = (async () => {
    const user = await User.findById(userId, projection).lean({ virtuals: true });
    cache.set(k, user ?? null); // cache null too
    return user ?? null;
  })();

  inflight.set(k, p);
  try {
    return await p;
  } finally {
    inflight.delete(k);
  }
}

module.exports = { getUserById };
