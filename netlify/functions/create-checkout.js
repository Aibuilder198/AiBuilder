// netlify/functions/create-checkout.js
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2023-10-16' });

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

    // Store form/site data in metadata so the webhook can email it
    const metadata = {};
    if (sitePayload?.businessName) metadata.businessName = sitePayload.businessName.slice(0, 200);
    if (sitePayload?.description)  metadata.description  = sitePayload.description.slice(0, 500);
    if (sitePayload?.htmlBase64)   metadata.htmlBase64   = sitePayload.htmlBase64; // can be large, but OK

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',                 // you’re using a one-time price
      line_items: items,
      success_url: successURL,
      cancel_url: cancelURL,
      billing_address_collection: 'auto',
      // Checkout will collect the buyer’s email for us:
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
