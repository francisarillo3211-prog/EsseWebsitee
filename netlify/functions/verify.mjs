// Netlify Function: netlify/functions/verify.mjs
// Endpoint: https://esse-shinigami.netlify.app/.netlify/functions/verify
//
// Environment Variables in Netlify:
//   1. LICENSE_KEYS   - optional comma-separated allowlist (e.g. "ESSE-1111-2222,ESSE-3333-4444")
//   2. LICENSE_SECRET - HMAC secret for stateless keys: ESSE-<PAYLOAD_HEX>-<SIG8_HEX>
//   3. ADMIN_PASSWORD - Admin password for generating keys & HWID management (defaults to "esse2026" if unset)

import crypto from "node:crypto";
import { getStore } from "@netlify/blobs";

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

function verifyHmacKey(key, secret) {
  if (!secret) return { ok: false, error: "invalid key" };
  const parts = key.split("-");
  if (parts.length !== 3 || parts[0] !== "ESSE") {
    return { ok: false, error: "invalid key" };
  }
  const [, payload, sig] = parts;
  const expected = signPayload(payload, secret);
  if (sig.toUpperCase() !== expected) {
    return { ok: false, error: "invalid key" };
  }

  // Check optional 8-hex-char expiration prefix (12-char hex payload: 8 exp + 4 rand)
  if (/^[0-9A-F]{12}$/i.test(payload)) {
    const expSec = parseInt(payload.slice(0, 8), 16);
    if (expSec > 0 && Math.floor(Date.now() / 1000) > expSec) {
      return { ok: false, error: "key expired", expired: true };
    }
  }

  return { ok: true };
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

  const adminPass = process.env.ADMIN_PASSWORD || "esse2026";

  // Admin key generation mode
  if (body?.action === "generate") {
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
  }

  // Admin: list bound HWIDs from Netlify Blobs ("licenses" store)
  if (body?.action === "list-hwids") {
    if (String(body?.adminPassword || "") !== adminPass) {
      return json(403, { ok: false, error: "unauthorized" });
    }

    const store = getStore("licenses");
    const requestedKeys = Array.isArray(body?.keys)
      ? body.keys.map((k) => String(k || "").trim()).filter(Boolean)
      : [];

    const hwids = {};
    await Promise.all(
      requestedKeys.map(async (k) => {
        try {
          const rec = await store.get(k, { type: "json" });
          if (rec && rec.hwid) {
            hwids[k] = { hwid: rec.hwid, boundAt: rec.boundAt || null };
          }
        } catch {
          // ignore missing/corrupt entry
        }
      })
    );

    return json(200, { ok: true, hwids });
  }

  // Admin: reset bound HWID in Netlify Blobs ("licenses" store)
  if (body?.action === "reset-hwid") {
    if (String(body?.adminPassword || "") !== adminPass) {
      return json(403, { ok: false, error: "unauthorized" });
    }

    const keyToReset = String(body?.key || "").trim();
    if (!keyToReset) {
      return json(400, { ok: false, error: "missing key" });
    }

    const store = getStore("licenses");
    const existing = (await store.get(keyToReset, { type: "json" })) || {};
    await store.setJSON(keyToReset, {
      ...existing,
      key: keyToReset,
      hwid: null,
      boundAt: null,
      hwidResetAt: Date.now(),
    });

    return json(200, { ok: true, key: keyToReset, hwid: null });
  }

  // Standard license verification + single-PC HWID binding
  const key = String(body?.key || "").trim();
  const hwid = String(body?.hwid || "").trim();
  if (!key) {
    return json(400, { valid: false, error: "missing key" });
  }
  if (!hwid) {
    return json(400, { valid: false, error: "missing hwid" });
  }

  const allowlist = (process.env.LICENSE_KEYS || "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  if (!allowlist.includes(key)) {
    const secret = process.env.LICENSE_SECRET || "";
    const hmacCheck = verifyHmacKey(key, secret);
    if (!hmacCheck.ok) {
      return json(403, {
        valid: false,
        error: hmacCheck.error,
        ...(hmacCheck.expired ? { expired: true } : {}),
      });
    }

    // Optional revocation check against Firestore license_keys collection
    try {
      const fsRes = await fetch(
        `https://firestore.googleapis.com/v1/projects/esse-2c2a1/databases/(default)/documents/license_keys/${encodeURIComponent(key)}`
      );
      if (fsRes.ok) {
        const fsDoc = await fsRes.json();
        if (fsDoc?.fields?.revoked?.booleanValue === true) {
          return json(403, { valid: false, error: "key revoked" });
        }
      }
    } catch {
      // Ignore network errors on optional revocation check
    }
  }

  // Enforce single-PC HWID lock in Netlify Blobs ("licenses" store)
  const store = getStore("licenses");
  const record = (await store.get(key, { type: "json" })) || {};

  if (record.hwid && record.hwid !== hwid) {
    return json(403, {
      valid: false,
      error: "HWID mismatch (key bound to another PC)",
    });
  }

  const boundAt = record.boundAt || Date.now();
  if (!record.hwid) {
    await store.setJSON(key, {
      ...record,
      key,
      hwid,
      boundAt,
    });
  }

  return json(200, { valid: true, hwid, boundAt });
};
