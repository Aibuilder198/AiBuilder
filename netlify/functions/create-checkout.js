// /netlify/functions/create-checkout.js
// Creates a Stripe Checkout Session for either one-time payment or subscription.
// Requires env: STRIPE_SECRET_KEY (and optionally SITE_URL for success/cancel)

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { priceId, meta, success_url, cancel_url } = JSON.parse(event.body || "{}");

    if (!priceId) {
      return { statusCode: 400, body: "Missing priceId" };
    }
    if (!process.env.STRIPE_SECRET_KEY) {
      return { statusCode: 500, body: "Missing STRIPE_SECRET_KEY env var" };
    }

    // Get price so we can pick correct mode
    const price = await stripe.prices.retrieve(priceId);
    if (!price || !price.active) {
      return { statusCode: 400, body: "Invalid or inactive price" };
    }
    const mode = price.recurring ? "subscription" : "payment";

    // Clamp metadata to avoid Stripe's 500-char limit
    const safeMeta = {};
    if (meta && typeof meta === "string") {
      safeMeta.client_meta = meta.slice(0, 450);
    }

    // Build success/cancel URLs
    const origin =
      process.env.SITE_URL ||
      `https://${process.env.URL || event.headers.host || ""}`;
    const successURL = success_url || `${origin}/success.html`;
    const cancelURL = cancel_url || `${origin}/`;

    const session = await stripe.checkout.sessions.create({
      mode,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successURL + "?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: cancelURL,
      metadata: safeMeta,
      allow_promotion_codes: true,
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err) {
    console.error("checkout error", err);
    return {
      statusCode: 500,
      body: `Checkout create failed: ${err.message}`,
    };
  }
};
