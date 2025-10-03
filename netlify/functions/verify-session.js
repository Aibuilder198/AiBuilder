// netlify/functions/verify-session.js
"use strict";

exports.handler = async (event) => {
  const sessionId = event.queryStringParameters?.session_id || "";
  if (!sessionId) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing session_id" }) };
  }

  try {
    const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
    if (!STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not set");

    const resp = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
      { headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` } }
    );
    const session = await resp.json();

    if (!resp.ok) {
      return { statusCode: resp.status, body: JSON.stringify(session) };
    }

    const paid = session.payment_status === "paid";
    const complete = session.status === "complete";
    if (!paid && !complete) {
      return { statusCode: 402, body: JSON.stringify({ error: "Payment not completed" }) };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true })
    };
  } catch (err) {
    console.error("verify-session error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
