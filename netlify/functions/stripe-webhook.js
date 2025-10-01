// netlify/functions/stripe-webhook.js
const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2023-10-16' });

// Simple mail sender via Resend HTTP API (no extra npm deps needed)
async function sendEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from   = process.env.FROM_EMAIL || 'no-reply@example.com';
  if (!apiKey) throw new Error('RESEND_API_KEY is not set');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend failed: ${text}`);
  }
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: { Allow: 'POST' }, body: 'Method Not Allowed' };
  }

  const sig = event.headers['stripe-signature'];
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!whSecret) return { statusCode: 500, body: 'Missing STRIPE_WEBHOOK_SECRET' };

  let stripeEvent;
  try {
    // IMPORTANT: Netlify gives us the raw body string; pass as-is
    stripeEvent = stripe.webhooks.constructEvent(event.body, sig, whSecret);
  } catch (err) {
    console.error('Signature verification failed:', err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  try {
    if (stripeEvent.type === 'checkout.session.completed') {
      const session = stripeEvent.data.object;

      // Email to the buyer (Stripe collects the email on Checkout)
      const customerEmail = session.customer_details?.email;
      const md = session.metadata || {};

      // Build the attachment-as-link (inline HTML). The builder HTML was sent base64 in metadata
      let siteHtml = '';
      if (md.htmlBase64) {
        // decode base64 → utf8
        siteHtml = Buffer.from(md.htmlBase64, 'base64').toString('utf8');
      } else {
        // fallback: minimal page if metadata missing
        siteHtml = `<html><body><h1>${md.businessName || 'Your Site'}</h1><p>${md.description || ''}</p></body></html>`;
      }

      const subject = `Your AI Website: ${md.businessName || 'Website'}`;

      // 1) Email the buyer (if we have an email)
      if (customerEmail) {
        await sendEmail({
          to: customerEmail,
          subject,
          html: `
            <p>Thanks for your purchase! Your AI-generated site is below.</p>
            <hr/>
            ${siteHtml}
          `
        });
      }

      // 2) Email you (admin copy)
      const adminEmail = process.env.ADMIN_EMAIL;
      if (adminEmail) {
        await sendEmail({
          to: adminEmail,
          subject: `New order: ${md.businessName || 'Website'}`,
          html: `
            <p>Order ID: ${session.id}</p>
            <p>Customer: ${customerEmail || 'unknown'}</p>
            <p><strong>Business:</strong> ${md.businessName || ''}</p>
            <p><strong>Description:</strong> ${md.description || ''}</p>
            <hr/>
            ${siteHtml}
          `
        });
      }

      console.log('Emails sent for session', session.id);
    } else {
      console.log('Ignoring event', stripeEvent.type);
    }

    return { statusCode: 200, body: 'ok' };
  } catch (err) {
    console.error('Webhook handler error:', err);
    return { statusCode: 500, body: 'Internal error' };
  }
};