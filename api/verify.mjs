// Vercel Serverless Function: api/verify.mjs
// Endpoint: https://esse-shinigami.vercel.app/api/verify (also /.netlify/functions/verify via rewrite)

import crypto from "node:crypto";

const FIRESTORE_BASE =
  "https://firestore.googleapis.com/v1/projects/esse-2c2a1/databases/(default)/documents/license_keys";

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

  if (/^[0-9A-F]{12}$/i.test(payload)) {
    const expSec = parseInt(payload.slice(0, 8), 16);
    if (expSec > 0 && Math.floor(Date.now() / 1000) > expSec) {
      return { ok: false, error: "key expired", expired: true };
    }
  }

  return { ok: true };
}

async function getLicenseDoc(key) {
  const r = await fetch(`${FIRESTORE_BASE}/${encodeURIComponent(key)}`);
  if (r.status === 404) return null;
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`Firestore read failed (${r.status}): ${text}`);
  }
  return r.json();
}

async function patchLicenseFields(key, fields) {
  const maskParams = Object.keys(fields)
    .map((f) => `updateMask.fieldPaths=${encodeURIComponent(f)}`)
    .join("&");
  const r = await fetch(`${FIRESTORE_BASE}/${encodeURIComponent(key)}?${maskParams}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields }),
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`Firestore write failed (${r.status}): ${text}`);
  }
  return r.json();
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return sendJson(res, 405, { valid: false, error: "method not allowed" });
  }

  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  } catch {
    return sendJson(res, 400, { valid: false, error: "invalid json" });
  }

  const adminPass = process.env.ADMIN_PASSWORD || "esse2026";

  // Admin: generate key
  if (body?.action === "generate") {
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

  // Admin: list bound HWIDs from Firestore
  if (body?.action === "list-hwids") {
    if (String(body?.adminPassword || "") !== adminPass) {
      return sendJson(res, 403, { ok: false, error: "unauthorized" });
    }

    const hwids = {};
    try {
      const r = await fetch(`${FIRESTORE_BASE}?pageSize=300`);
      if (r.ok) {
        const data = await r.json();
        for (const doc of data.documents || []) {
          const docId = doc.name.split("/").pop();
          const hwid = doc.fields?.hwid?.stringValue || null;
          const boundAtRaw = doc.fields?.boundAt?.integerValue;
          if (hwid) {
            hwids[docId] = {
              hwid,
              boundAt: boundAtRaw ? Number(boundAtRaw) : null,
            };
          }
        }
      }
    } catch {
      // ignore
    }

    return sendJson(res, 200, { ok: true, hwids });
  }

  // Admin: reset bound HWID in Firestore
  if (body?.action === "reset-hwid") {
    if (String(body?.adminPassword || "") !== adminPass) {
      return sendJson(res, 403, { ok: false, error: "unauthorized" });
    }

    const keyToReset = String(body?.key || "").trim();
    if (!keyToReset) {
      return sendJson(res, 400, { ok: false, error: "missing key" });
    }

    try {
      await patchLicenseFields(keyToReset, {
        key: { stringValue: keyToReset },
        hwid: { nullValue: null },
        boundAt: { nullValue: null },
        hwidResetAt: { integerValue: String(Date.now()) },
      });
      return sendJson(res, 200, { ok: true, key: keyToReset, hwid: null });
    } catch (e) {
      return sendJson(res, 500, { ok: false, error: e.message });
    }
  }

  // Standard verification + single-PC HWID binding
  const key = String(body?.key || "").trim();
  const hwid = String(body?.hwid || "").trim();
  if (!key) {
    return sendJson(res, 400, { valid: false, error: "missing key" });
  }
  if (!hwid) {
    return sendJson(res, 400, { valid: false, error: "missing hwid" });
  }

  const allowlist = (process.env.LICENSE_KEYS || "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  if (!allowlist.includes(key)) {
    const secret = process.env.LICENSE_SECRET || "";
    const hmacCheck = verifyHmacKey(key, secret);
    if (!hmacCheck.ok) {
      return sendJson(res, 403, {
        valid: false,
        error: hmacCheck.error,
        ...(hmacCheck.expired ? { expired: true } : {}),
      });
    }
  }

  try {
    const fsDoc = await getLicenseDoc(key);
    if (fsDoc?.fields?.revoked?.booleanValue === true) {
      return sendJson(res, 403, { valid: false, error: "key revoked" });
    }

    const existingHwid = fsDoc?.fields?.hwid?.stringValue || "";
    if (existingHwid && existingHwid !== hwid) {
      return sendJson(res, 403, {
        valid: false,
        error: "HWID mismatch (key bound to another PC)",
      });
    }

    const existingBoundAt = fsDoc?.fields?.boundAt?.integerValue
      ? Number(fsDoc.fields.boundAt.integerValue)
      : null;
    const boundAt = existingBoundAt || Date.now();

    if (!existingHwid) {
      await patchLicenseFields(key, {
        key: { stringValue: key },
        hwid: { stringValue: hwid },
        boundAt: { integerValue: String(boundAt) },
      });
    }

    return sendJson(res, 200, { valid: true, hwid, boundAt });
  } catch (e) {
    return sendJson(res, 500, { valid: false, error: `HWID check failed: ${e.message}` });
  }
}
