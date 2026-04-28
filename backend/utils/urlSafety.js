const dns = require("dns").promises;
const net = require("net");

const BLOCKED_HOSTS = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
]);

const BLOCKED_SUFFIXES = [
  ".local",
  ".internal",
  ".localhost",
  ".test",
  ".invalid",
  ".home",
  ".lan",
];

function ipv4ToInt(ip) {
  return ip.split(".").reduce((acc, part) => ((acc << 8) + Number(part)) >>> 0, 0);
}

function ipv4InRange(ip, cidrBase, bits) {
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (ipv4ToInt(ip) & mask) === (ipv4ToInt(cidrBase) & mask);
}

function isBlockedIPv4(ip) {
  return [
    ["0.0.0.0", 8],
    ["10.0.0.0", 8],
    ["100.64.0.0", 10],
    ["127.0.0.0", 8],
    ["169.254.0.0", 16],
    ["172.16.0.0", 12],
    ["192.0.0.0", 24],
    ["192.0.2.0", 24],
    ["192.168.0.0", 16],
    ["198.18.0.0", 15],
    ["198.51.100.0", 24],
    ["203.0.113.0", 24],
    ["224.0.0.0", 4],
    ["240.0.0.0", 4],
  ].some(([base, bits]) => ipv4InRange(ip, base, bits));
}

function isBlockedIPv6(ip) {
  const normalized = ip.toLowerCase();
  if (normalized.startsWith("::ffff:")) {
    const mapped = normalized.slice("::ffff:".length);
    if (net.isIP(mapped) === 4) return isBlockedIPv4(mapped);
  }
  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:")
  );
}

function isBlockedIp(ip) {
  const version = net.isIP(ip);
  if (version === 4) return isBlockedIPv4(ip);
  if (version === 6) return isBlockedIPv6(ip);
  return false;
}

function assertSafeHostname(hostname) {
  const host = String(hostname || "").toLowerCase().replace(/\.$/, "");
  if (!host) throw new Error("URL hostname is required");
  if (BLOCKED_HOSTS.has(host)) throw new Error("Internal hostname is not allowed");
  if (!host.includes(".") && !net.isIP(host)) throw new Error("Internal hostname is not allowed");
  if (BLOCKED_SUFFIXES.some((suffix) => host.endsWith(suffix))) {
    throw new Error("Internal hostname is not allowed");
  }
  if (net.isIP(host) && isBlockedIp(host)) {
    throw new Error("Private or internal IP address is not allowed");
  }
}

async function assertSafeUrl(input, options = {}) {
  const { resolveDns = true } = options;
  let parsed;

  try {
    parsed = new URL(input);
  } catch {
    throw new Error("Invalid URL");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only http and https URLs are allowed");
  }

  assertSafeHostname(parsed.hostname);

  if (resolveDns && !net.isIP(parsed.hostname)) {
    const records = await dns.lookup(parsed.hostname, { all: true, verbatim: true });
    if (!records.length) throw new Error("URL hostname could not be resolved");
    if (records.some((record) => isBlockedIp(record.address))) {
      throw new Error("URL resolves to a private or internal IP address");
    }
  }

  return parsed.toString();
}

module.exports = {
  assertSafeUrl,
  isBlockedIp,
};
