// /netlify/functions/verify-session.js
// Verifies payment in two ways:
// 1) If ?session_id=... is provided: checks Stripe for paid/completed, and sets a cookie.
// 2) If no session_id: trusts an existing cookie "stripe_paid=1" (set after success).
//
// Env required: STRIPE_SECRET_KEY

const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// Parse cookies from request headers
function getCookie(headers, name) {
  const raw = headers.cookie || headers.Cookie || "";
  const parts = raw.split(/;\s*/);
  for (const p of parts) {
    const [k, v] = p.split("=");
    if (k === name) return decodeURIComponent(v || "");
  }
  return "";
}

exports.handler = async (event) => {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return { statusCode: 500, body: JSON.stringify({ verified: false, error: "Missing STRIPE_SECRET_KEY" }) };
    }

    const params = event.queryStringParameters || {};
    const session_id = params.session_id;

    // Case A: Client asked to verify a specific session_id
    if (session_id) {
      try {
        const session = await stripe.checkout.sessions.retrieve(session_id);
        const paid = session?.payment_status === "paid" || session?.status === "complete";

        // If verified, set a cookie so subsequent calls can succeed without passing session_id.
        const headers = {
          "Content-Type": "application/json",
          // Cookie lasts 1 year; adjust as needed
          "Set-Cookie": `stripe_paid=${paid ? "1" : "0"}; Path=/; Max-Age=31536000; SameSite=Lax`
        };

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ verified: !!paid })
        };
      } catch (e) {
        return {
          statusCode: 200,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ verified: false, error: "Invalid session_id" })
        };
      }
    }

    // Case B: No session_id provided — fall back to cookie
    const hasCookie = getCookie(event.headers || {}, "stripe_paid");
    const verified = hasCookie === "1";

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ verified })
    };
  } catch (err) {
    console.error("verify-session error:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ verified: false, error: err.message })
    };
  }
};
