// netlify/functions/stripe-webhook.js
const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

// Netlify passes raw body via event.body; we must verify signature
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: { Allow: 'POST' }, body: 'Method Not Allowed' };
  }

  const sig = event.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('Missing STRIPE_WEBHOOK_SECRET');
    return { statusCode: 500, body: 'Webhook misconfigured' };
  }

  let stripeEvent;
  try {
    // important: event.body is a string; we pass it directly
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      webhookSecret
    );
  } catch (err) {
    console.error('Signature verification failed:', err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  try {
    // Handle events you care about
    switch (stripeEvent.type) {
      case 'checkout.session.completed': {
        const session = stripeEvent.data.object;
        // TODO: do your fulfillment here
        // e.g., session.customer_email, session.id, session.amount_total
        console.log('Checkout completed for session', session.id);
        break;
      }
      default:
        console.log(`Unhandled event type ${stripeEvent.type}`);
    }

    return { statusCode: 200, body: 'ok' };
  } catch (err) {
    console.error('Webhook handler error:', err);
    return { statusCode: 500, body: 'Internal error' };
  }
};
