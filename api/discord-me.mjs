// Vercel Serverless Function: api/discord-me.mjs

import crypto from "node:crypto";

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    out[part.slice(0, idx).trim()] = part.slice(idx + 1).trim();
  }
  return out;
}

export default async function handler(req, res) {
  const sessionSecret = process.env.DISCORD_SESSION_SECRET || process.env.LICENSE_SECRET || "";
  const cookies = parseCookies(req.headers.cookie || "");
  const token = cookies.esse_discord_session || "";

  res.setHeader("Cache-Control", "no-store");

  if (!token || !sessionSecret || !token.includes(".")) {
    return res.status(200).json({ loggedIn: false });
  }

  const [payloadB64, sig] = token.split(".");
  const expected = crypto.createHmac("sha256", sessionSecret).update(payloadB64).digest("base64url");

  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return res.status(200).json({ loggedIn: false });
    }
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
    if (!payload?.id || !payload?.exp || Date.now() > payload.exp) {
      return res.status(200).json({ loggedIn: false });
    }
    return res.status(200).json({
      loggedIn: true,
      user: {
        id: payload.id,
        username: payload.username,
        global_name: payload.global_name,
        avatar: payload.avatar,
      },
    });
  } catch {
    return res.status(200).json({ loggedIn: false });
  }
}
