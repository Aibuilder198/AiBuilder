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
    const { items = [], success_url, cancel_url, sitePayload, mode } = JSON.parse(event.body || '{}');

    if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is not set');
    if (!Array.isArray(items) || items.length === 0)
      throw new Error('No items provided. Expected items: [{ price: "...", quantity: 1 }]');

    const origin = process.env.URL || 'http://localhost:8888';
    const successURL = success_url || `${origin}/success`;
    const cancelURL  = cancel_url  || `${origin}/cancel`;

    // ---- metadata (chunked) ----
    const metadata = {};
    if (sitePayload?.businessName) metadata.businessName = sitePayload.businessName.slice(0, 200);
    if (sitePayload?.description)  metadata.description  = sitePayload.description.slice(0, 500);
    if (sitePayload?.htmlBase64) {
      const parts = chunkString(sitePayload.htmlBase64, 480);
      const maxParts = Math.min(parts.length, 48); // leave space for other keys
      for (let i = 0; i < maxParts; i++) metadata[`html_${i}`] = parts[i];
      metadata.html_parts = String(maxParts);
    }

    const session = await stripe.checkout.sessions.create({
      mode: mode === 'subscription' ? 'subscription' : 'payment', // <-- supports both
      line_items: items,
      success_url: successURL,
      cancel_url: cancelURL,
      billing_address_collection: 'auto',
      metadata
    });

    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: session.url, id: session.id }) };
  } catch (err) {
    console.error('create-checkout error:', err);
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: err.message }) };
  }
};
