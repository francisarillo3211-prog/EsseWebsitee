// Vercel Serverless Function: api/discord-auth.mjs

export default async function handler(req, res) {
  const clientId = process.env.DISCORD_CLIENT_ID || "";
  if (!clientId) {
    return res.status(500).send("DISCORD_CLIENT_ID is not configured.");
  }

  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const origin = `${proto}://${host}`;
  const redirectUri = `${origin}/api/discord-callback`;

  const reqUrl = new URL(req.url, origin);
  const openMember = (reqUrl.searchParams.get("open") || "").replace(/[^a-zA-Z0-9_.-]/g, "");
  const state = Buffer.from(JSON.stringify({ open: openMember, ts: Date.now() })).toString("base64url");

  const authUrl = new URL("https://discord.com/oauth2/authorize");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "identify");
  authUrl.searchParams.set("state", state);

  res.writeHead(302, { Location: authUrl.toString() });
  res.end();
}
