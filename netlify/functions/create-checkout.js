// netlify/functions/create-checkout.js
const Stripe = require('stripe');

// Ensure key is present
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: { Allow: 'POST' }, body: 'Method Not Allowed' };
  }

  try {
    const { items = [], success_url, cancel_url } = JSON.parse(event.body || '{}');

    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not set in Netlify environment variables');
    }
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('No items provided. Expected items: [{ price: "price_xxx", quantity: 1 }]');
    }

    // Fallback URLs if not sent by the client
    const origin = process.env.URL || 'http://localhost:8888';
    const successURL = success_url || `${origin}/success`;
    const cancelURL = cancel_url || `${origin}/cancel`;

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: items,               // e.g. [{ price: 'price_123', quantity: 1 }]
      success_url: successURL,
      cancel_url: cancelURL,
      billing_address_collection: 'auto',
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: session.url, id: session.id }),
    };
  } catch (err) {
    console.error('create-checkout error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: err.message,
        // uncomment during debugging ONLY:
        // stack: err.stack,
      }),
    };
  }
};
