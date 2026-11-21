// Netlify Function: netlify/functions/discord-logout.mjs
// Clears the Discord session cookie.

export default async (req) => {
  const url = new URL(req.url);
  const isHttps = url.protocol === "https:";
  const cookieFlags = `HttpOnly; Path=/; Max-Age=0; SameSite=Lax${isHttps ? "; Secure" : ""}`;

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": `esse_discord_session=; ${cookieFlags}`,
    },
  });
};
