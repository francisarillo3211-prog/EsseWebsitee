// Drop-in Netlify Function (copy to netlify/functions/verify.mjs in your site repo).
// Endpoint: https://esse-shinigami.netlify.app/.netlify/functions/verify
//
// Supports two zero-dependency validation modes via Netlify Environment Variables:
//   1. LICENSE_KEYS   - comma-separated allowlist of keys (e.g. "ESSE-1111-2222,ESSE-3333-4444")
//   2. LICENSE_SECRET - optional HMAC secret for stateless keys formatted as:
//                       ESSE-<PAYLOAD_HEX>-<SIG8_HEX> (first 8 hex chars of HMAC-SHA256)

import crypto from "node:crypto";

function json(status, data) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

function verifyHmacKey(key, secret) {
  if (!secret) return false;
  const parts = key.split("-");
  if (parts.length !== 3 || parts[0] !== "ESSE") return false;
  const [, payload, sig] = parts;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex")
    .slice(0, 8)
    .toUpperCase();
  return sig.toUpperCase() === expected;
}

export default async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (req.method !== "POST") {
    return json(405, { valid: false, error: "method not allowed" });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return json(400, { valid: false, error: "invalid json" });
  }

  const key = String(body?.key || "").trim();
  const hwid = String(body?.hwid || "").trim();
  if (!key) {
    return json(400, { valid: false, error: "missing key" });
  }

  const allowlist = (process.env.LICENSE_KEYS || "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
  const secret = process.env.LICENSE_SECRET || "";

  const ok = allowlist.includes(key) || verifyHmacKey(key, secret);
  if (!ok) {
    return json(403, { valid: false, error: "invalid key" });
  }

  return json(200, { valid: true, hwid });
};
