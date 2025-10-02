// netlify/functions/create-checkout.js
// Complete drop-in for creating Stripe Checkout Sessions
// Supports both one-time payments (mode: "payment") and subscriptions (mode: "subscription")

const Stripe = require("stripe");

// IMPORTANT: set STRIPE_SECRET_KEY in your Netlify environment variables
// Site dashboard → Site settings → Build & deploy → Environment → Environment variables
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2023-10-16",
});

/**
 * Chunk a long string so it fits into Stripe metadata (40 key limit, 500 chars each).
 * We use a conservative chunk size to stay well under per-key limits.
 */
function chunkString(str, size) {
  const out = [];
  for (let i = 0; i < str.length; i += size) out.push(str.slice(i, i + size));
  return out;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { Allow: "POST", "Content-Type": "text/plain" },
      body: "Method Not Allowed",
    };
  }

  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not set in environment variables.");
    }

    const {
      // required
      items = [], // [{ price: "price_xxx", quantity: 1 }]
      // optional
      mode, // "payment" (default) | "subscription"
      success_url,
      cancel_url,
      // optional, used to reconstruct and/or email the generated site
      sitePayload, // { businessName, description, htmlBase64 }
      // optional, helpful for your own records
      client_reference_id,
      planName, // e.g., "Basic", "Pro", "Business"
    } = JSON.parse(event.body || "{}");

    if (!Array.isArray(items) || items.length === 0) {
      throw new Error(
        "No line items provided. Expected items: [{ price: 'price_...', quantity: 1 }]"
      );
    }

    // Resolve URLs (Netlify automatically sets process.env.URL on production deploys)
    const origin = process.env.URL || "http://localhost:8888";
    const successURL = success_url || `${origin}/success`;
    const cancelURL = cancel_url || `${origin}/cancel`;

    // ---- Build metadata (safe, chunked) ----
    // Stripe Checkout metadata key limit: 40 keys per object. Keep it compact.
    const metadata = {};

    if (sitePayload?.businessName) {
      metadata.businessName = String(sitePayload.businessName).slice(0, 200);
    }
    if (sitePayload?.description) {
      metadata.description = String(sitePayload.description).slice(0, 500);
    }
    if (planName) {
      metadata.planName = String(planName).slice(0, 100);
    }

    // If you’re passing the full generated HTML (base64), chunk it
    if (sitePayload?.htmlBase64) {
      const parts = chunkString(String(sitePayload.htmlBase64), 480); // conservative per-key size
      const maxParts = Math.min(parts.length, 48); // leave room for other keys
      for (let i = 0; i < maxParts; i++) {
        metadata[`html_${i}`] = parts[i];
      }
      metadata.html_parts = String(maxParts);
      metadata.html_encoding = "base64";
    }

    // ---- Create Checkout Session ----
    const session = await stripe.checkout.sessions.create({
      mode: mode === "subscription" ? "subscription" : "payment",
      line_items: items,
      success_url: successURL,
      cancel_url: cancelURL,
      billing_address_collection: "auto",
      allow_promotion_codes: true,
      client_reference_id: client_reference_id || undefined,
      metadata,
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: session.url, id: session.id }),
    };
  } catch (err) {
    console.error("create-checkout error:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
