// Netlify Function: netlify/functions/discord-auth.mjs
// Redirects user to Discord OAuth2 authorization screen.

export default async (req) => {
  const clientId = process.env.DISCORD_CLIENT_ID || "";
  if (!clientId) {
    return new Response("DISCORD_CLIENT_ID is not configured.", { status: 500 });
  }

  const url = new URL(req.url);
  const origin = `${url.protocol}//${url.host}`;
  const redirectUri = `${origin}/.netlify/functions/discord-callback`;
  const openMember = (url.searchParams.get("open") || "").replace(/[^a-zA-Z0-9_.-]/g, "");
  const state = Buffer.from(JSON.stringify({ open: openMember, ts: Date.now() })).toString("base64url");

  const authUrl = new URL("https://discord.com/oauth2/authorize");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "identify");
  authUrl.searchParams.set("state", state);

  return new Response(null, {
    status: 302,
    headers: { Location: authUrl.toString() },
  });
};
