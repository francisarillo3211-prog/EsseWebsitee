// Netlify Function: netlify/functions/discord-callback.mjs
// Exchanges Discord OAuth code for user info and sets a signed HttpOnly session cookie.

import crypto from "node:crypto";

function signSession(payloadB64, secret) {
  return crypto.createHmac("sha256", secret).update(payloadB64).digest("base64url");
}

export default async (req) => {
  const url = new URL(req.url);
  const origin = `${url.protocol}//${url.host}`;
  const code = url.searchParams.get("code");
  const stateRaw = url.searchParams.get("state") || "";

  if (!code) {
    return new Response(null, {
      status: 302,
      headers: { Location: `${origin}/?discord_error=cancelled` },
    });
  }

  const clientId = process.env.DISCORD_CLIENT_ID || "";
  const clientSecret = process.env.DISCORD_CLIENT_SECRET || "";
  const sessionSecret = process.env.DISCORD_SESSION_SECRET || process.env.LICENSE_SECRET || "";

  if (!clientId || !clientSecret || !sessionSecret) {
    return new Response("Discord OAuth is not fully configured on Netlify.", { status: 500 });
  }

  const redirectUri = `${origin}/.netlify/functions/discord-callback`;

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
    return new Response(null, {
      status: 302,
      headers: { Location: `${origin}/?discord_error=token_failed` },
    });
  }

  const tokenData = await tokenRes.json();
  const userRes = await fetch("https://discord.com/api/v10/users/@me", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  if (!userRes.ok) {
    return new Response(null, {
      status: 302,
      headers: { Location: `${origin}/?discord_error=user_failed` },
    });
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

  const isHttps = url.protocol === "https:";
  const cookieFlags = `HttpOnly; Path=/; Max-Age=${7 * 24 * 60 * 60}; SameSite=Lax${isHttps ? "; Secure" : ""}`;

  return new Response(null, {
    status: 302,
    headers: {
      "Set-Cookie": `esse_discord_session=${cookieVal}; ${cookieFlags}`,
      Location: `${origin}/?discord_login=1${openParam}`,
    },
  });
};
