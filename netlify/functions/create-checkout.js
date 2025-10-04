// /netlify/functions/create-checkout.js
const Stripe = require("stripe");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { plan, successUrl } = JSON.parse(event.body || "{}");

    // Map plan -> price + mode
    const priceMap = {
      basic: { price: "price_1SDFSNAmJkffDNdt0pAhcn8Y", mode: "payment" },
      pro: { price: "price_1SDbHKAmJkffDNdtYP9sVw1T", mode: "subscription" },
      business: { price: "price_1SDbI1AmJkffDNdtjiqSI7qF", mode: "subscription" },
    };

    const conf = priceMap[(plan || "basic").toLowerCase()] || priceMap.basic;

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    // Build success/cancel URLs
    // success: redirect back with the session_id for verification
    const success_url = (successUrl || process.env.SITE_URL || "https://example.com") +
      "?session_id={CHECKOUT_SESSION_ID}";
    const cancel_url = (process.env.SITE_URL || successUrl || "https://example.com");

    const session = await stripe.checkout.sessions.create({
      mode: conf.mode,
      line_items: [{ price: conf.price, quantity: 1 }],
      success_url,
      cancel_url,
      // (Optional) collect email
      customer_creation: "if_required",
    });

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
