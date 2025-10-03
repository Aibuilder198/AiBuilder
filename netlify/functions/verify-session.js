// netlify/functions/verify-session.js
"use strict";

function reconstructHTML(metadata = {}) {
  if (!metadata.html_parts) return null;
  const count = parseInt(metadata.html_parts, 10);
  let b64 = "";
  for (let i = 0; i < count; i++) b64 += metadata[`html_${i}`] || "";
  try {
    return decodeURIComponent(escape(Buffer.from(b64, "base64").toString("utf8")));
  } catch (e) {
    console.error("Failed to decode base64 HTML:", e);
    return null;
  }
}

exports.handler = async (event) => {
  const sessionId = event.queryStringParameters?.session_id || "";
  if (!sessionId) return { statusCode: 400, body: JSON.stringify({ error: "Missing session_id" }) };

  try {
    const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
    if (!STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not set");

    const resp = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` },
    });
    const session = await resp.json();
    if (!resp.ok) return { statusCode: resp.status, body: JSON.stringify(session) };

    const isPaid = session.payment_status === "paid";
    const isComplete = session.status === "complete";
    if (!isPaid && !isComplete) {
      return { statusCode: 402, body: JSON.stringify({ error: "Payment not completed" }) };
    }

    const html = reconstructHTML(session.metadata || {});
    if (!html) {
      return { statusCode: 404, body: JSON.stringify({ error: "No site data found" }) };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ok: true,
        filename: "site.html",
        htmlBase64: Buffer.from(html, "utf8").toString("base64"),
      }),
    };
  } catch (err) {
    console.error("verify-session error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
