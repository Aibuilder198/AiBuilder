// /netlify/functions/create-checkout.js
// Requires env: STRIPE_SECRET_KEY (and optionally SITE_URL for redirects)

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { priceId, meta, success_url, cancel_url } = JSON.parse(event.body || "{}");
    if (!process.env.STRIPE_SECRET_KEY) {
      return { statusCode: 500, body: "Missing STRIPE_SECRET_KEY" };
    }
    if (!priceId) {
      return { statusCode: 400, body: "Missing priceId" };
    }

    // Look up price to decide mode (payment vs subscription)
    const price = await stripe.prices.retrieve(priceId);
    if (!price || !price.active) {
      return { statusCode: 400, body: "Invalid or inactive price" };
    }
    const mode = price.recurring ? "subscription" : "payment";

    // Safe, short metadata to avoid 500-char limit
    const safeMeta = {};
    if (meta && typeof meta === "string") {
      safeMeta.client_meta = meta.slice(0, 450);
    }

    // Build redirect URLs
    const origin =
      process.env.SITE_URL ||
      `https://${process.env.URL || event.headers.host || ""}`;
    const successURL = (success_url || `${origin}/success.html`) + "?session_id={CHECKOUT_SESSION_ID}";
    const cancelURL = cancel_url || `${origin}/`;

    const session = await stripe.checkout.sessions.create({
      mode,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successURL,
      cancel_url: cancelURL,
      metadata: safeMeta,
      allow_promotion_codes: true
    });

    // Return the session ID (for redirectToCheckout)
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: session.id })
    };
  } catch (err) {
    console.error("create-checkout error:", err);
    return { statusCode: 500, body: `Checkout create failed: ${err.message}` };
  }
};
