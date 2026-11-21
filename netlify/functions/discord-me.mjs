// Netlify Function: netlify/functions/discord-me.mjs
// Verifies the signed Discord session cookie and returns the logged-in user.

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

export default async (req) => {
  const sessionSecret = process.env.DISCORD_SESSION_SECRET || process.env.LICENSE_SECRET || "";
  const cookies = parseCookies(req.headers.get("cookie") || "");
  const token = cookies.esse_discord_session || "";

  const json = (data) =>
    new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });

  if (!token || !sessionSecret || !token.includes(".")) {
    return json({ loggedIn: false });
  }

  const [payloadB64, sig] = token.split(".");
  const expected = crypto.createHmac("sha256", sessionSecret).update(payloadB64).digest("base64url");

  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return json({ loggedIn: false });
    }
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
    if (!payload?.id || !payload?.exp || Date.now() > payload.exp) {
      return json({ loggedIn: false });
    }
    return json({
      loggedIn: true,
      user: {
        id: payload.id,
        username: payload.username,
        global_name: payload.global_name,
        avatar: payload.avatar,
      },
    });
  } catch {
    return json({ loggedIn: false });
  }
};
