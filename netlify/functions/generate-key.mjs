// Netlify Function: netlify/functions/generate-key.mjs
// Endpoint: https://esse-shinigami.netlify.app/.netlify/functions/generate-key

import crypto from "node:crypto";

const DURATION_SECONDS = {
  "1d": 1 * 86400,
  "3d": 3 * 86400,
  "7d": 7 * 86400,
  "15d": 15 * 86400,
  "30d": 30 * 86400,
  "lifetime": 0,
};

function json(status, data) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

function signPayload(payload, secret) {
  return crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex")
    .slice(0, 8)
    .toUpperCase();
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
    return json(405, { ok: false, error: "method not allowed" });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return json(400, { ok: false, error: "invalid json" });
  }

  const adminPass = process.env.ADMIN_PASSWORD || "esse2026";
  if (String(body?.adminPassword || "") !== adminPass) {
    return json(403, { ok: false, error: "unauthorized" });
  }

  const secret = process.env.LICENSE_SECRET || "";
  if (!secret) {
    return json(500, { ok: false, error: "LICENSE_SECRET is not set in Netlify environment variables" });
  }

  const duration = String(body?.duration || "lifetime").toLowerCase();
  if (!(duration in DURATION_SECONDS)) {
    return json(400, { ok: false, error: "invalid duration" });
  }

  const seconds = DURATION_SECONDS[duration];
  const expSec = seconds > 0 ? Math.floor(Date.now() / 1000) + seconds : 0;
  const expHex = expSec.toString(16).padStart(8, "0").toUpperCase();
  const randHex = crypto.randomBytes(2).toString("hex").toUpperCase();
  const payload = `${expHex}${randHex}`;
  const sig = signPayload(payload, secret);
  const key = `ESSE-${payload}-${sig}`;

  return json(200, {
    ok: true,
    key,
    duration,
    expiresAt: expSec > 0 ? new Date(expSec * 1000).toISOString() : "lifetime",
  });
};
