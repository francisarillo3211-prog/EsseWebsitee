// Vercel Serverless Function: api/discord-logout.mjs

export default async function handler(req, res) {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const isHttps = proto === "https";
  const cookieFlags = `HttpOnly; Path=/; Max-Age=0; SameSite=Lax${isHttps ? "; Secure" : ""}`;

  res.setHeader("Set-Cookie", `esse_discord_session=; ${cookieFlags}`);
  return res.status(200).json({ ok: true });
}
