// Vercel Serverless Function: api/generate-key.mjs
// Endpoint: https://esse-shinigami.vercel.app/api/generate-key

import crypto from "node:crypto";

const DURATION_SECONDS = {
  "1d": 1 * 86400,
  "3d": 3 * 86400,
  "7d": 7 * 86400,
  "15d": 15 * 86400,
  "30d": 30 * 86400,
  "lifetime": 0,
};

function sendJson(res, status, data) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.status(status).json(data);
}

function signPayload(payload, secret) {
  return crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex")
    .slice(0, 8)
    .toUpperCase();
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return sendJson(res, 405, { ok: false, error: "method not allowed" });
  }

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  const adminPass = process.env.ADMIN_PASSWORD || "esse2026";
  if (String(body?.adminPassword || "") !== adminPass) {
    return sendJson(res, 403, { ok: false, error: "unauthorized" });
  }

  const secret = process.env.LICENSE_SECRET || "";
  if (!secret) {
    return sendJson(res, 500, { ok: false, error: "LICENSE_SECRET is not set in environment variables" });
  }

  const duration = String(body?.duration || "lifetime").toLowerCase();
  if (!(duration in DURATION_SECONDS)) {
    return sendJson(res, 400, { ok: false, error: "invalid duration" });
  }

  const seconds = DURATION_SECONDS[duration];
  const expSec = seconds > 0 ? Math.floor(Date.now() / 1000) + seconds : 0;
  const expHex = expSec.toString(16).padStart(8, "0").toUpperCase();
  const randHex = crypto.randomBytes(2).toString("hex").toUpperCase();
  const payload = `${expHex}${randHex}`;
  const sig = signPayload(payload, secret);
  const key = `ESSE-${payload}-${sig}`;

  return sendJson(res, 200, {
    ok: true,
    key,
    duration,
    expiresAt: expSec > 0 ? new Date(expSec * 1000).toISOString() : "lifetime",
  });
}
