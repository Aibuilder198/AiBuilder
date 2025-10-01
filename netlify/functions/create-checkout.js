// netlify/functions/create-checkout.js
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2023-10-16' });

function chunkString(str, size) {
  const out = [];
  for (let i = 0; i < str.length; i += size) out.push(str.slice(i, i + size));
  return out;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: { Allow: 'POST' }, body: 'Method Not Allowed' };
  }

  try {
    const { items = [], success_url, cancel_url, sitePayload } = JSON.parse(event.body || '{}');

    if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is not set');
    if (!Array.isArray(items) || items.length === 0)
      throw new Error('No items provided. Expected items: [{ price: "price_xxx", quantity: 1 }]');

    const origin = process.env.URL || 'http://localhost:8888';
    const successURL = success_url || `${origin}/success`;
    const cancelURL  = cancel_url  || `${origin}/cancel`;

    // ---- Build metadata safely within Stripe limits ----
    // Stripe: max 50 keys; each value max 500 chars.
    const metadata = {};
    if (sitePayload?.businessName) metadata.businessName = sitePayload.businessName.slice(0, 200);
    if (sitePayload?.description)  metadata.description  = sitePayload.description.slice(0, 500);

    if (sitePayload?.htmlBase64) {
      const parts = chunkString(sitePayload.htmlBase64, 480); // leave headroom < 500
      const maxParts = Math.min(parts.length, 50 - Object.keys(metadata).length - 1); // keep under 50 keys
      for (let i = 0; i < maxParts; i++) {
        metadata[`html_${i}`] = parts[i];
      }
      metadata.html_parts = String(maxParts); // record how many we stored
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: items,
      success_url: successURL,
      cancel_url: cancelURL,
      billing_address_collection: 'auto',
      metadata
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: session.url, id: session.id }),
    };
  } catch (err) {
    console.error('create-checkout error:', err);
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: err.message }) };
  }
};
