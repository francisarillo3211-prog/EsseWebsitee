// Vercel Serverless Function: api/discord-callback.mjs

import crypto from "node:crypto";

function signSession(payloadB64, secret) {
  return crypto.createHmac("sha256", secret).update(payloadB64).digest("base64url");
}

export default async function handler(req, res) {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const origin = `${proto}://${host}`;

  const reqUrl = new URL(req.url, origin);
  const code = reqUrl.searchParams.get("code");
  const stateRaw = reqUrl.searchParams.get("state") || "";

  if (!code) {
    res.writeHead(302, { Location: `${origin}/?discord_error=cancelled` });
    return res.end();
  }

  const clientId = process.env.DISCORD_CLIENT_ID || "";
  const clientSecret = process.env.DISCORD_CLIENT_SECRET || "";
  const sessionSecret = process.env.DISCORD_SESSION_SECRET || process.env.LICENSE_SECRET || "";

  if (!clientId || !clientSecret || !sessionSecret) {
    return res.status(500).send("Discord OAuth is not fully configured on Vercel.");
  }

  const redirectUri = `${origin}/api/discord-callback`;

  const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenRes.ok) {
    res.writeHead(302, { Location: `${origin}/?discord_error=token_failed` });
    return res.end();
  }

  const tokenData = await tokenRes.json();
  const userRes = await fetch("https://discord.com/api/v10/users/@me", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  if (!userRes.ok) {
    res.writeHead(302, { Location: `${origin}/?discord_error=user_failed` });
    return res.end();
  }

  const user = await userRes.json();
  const sessionPayload = {
    id: String(user.id),
    username: user.username || "",
    global_name: user.global_name || user.username || "",
    avatar: user.avatar || null,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  };

  const payloadB64 = Buffer.from(JSON.stringify(sessionPayload)).toString("base64url");
  const sig = signSession(payloadB64, sessionSecret);
  const cookieVal = `${payloadB64}.${sig}`;

  let openParam = "";
  try {
    const parsedState = JSON.parse(Buffer.from(stateRaw, "base64url").toString("utf8"));
    if (parsedState?.open) {
      openParam = `&open=${encodeURIComponent(String(parsedState.open))}`;
    }
  } catch {
    // ignore invalid state
  }

  const isHttps = proto === "https";
  const cookieFlags = `HttpOnly; Path=/; Max-Age=${7 * 24 * 60 * 60}; SameSite=Lax${isHttps ? "; Secure" : ""}`;

  res.setHeader("Set-Cookie", `esse_discord_session=${cookieVal}; ${cookieFlags}`);
  res.writeHead(302, { Location: `${origin}/?discord_login=1${openParam}` });
  res.end();
}
