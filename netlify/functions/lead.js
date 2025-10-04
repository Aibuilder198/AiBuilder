// netlify/functions/lead.js
// POST { name, email, phone, message, source, siteUrl }
export const handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders(),
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return json({ error: 'Method Not Allowed' }, 405);
  }

  try {
    const { name = '', email = '', phone = '', message = '', source = '', siteUrl = '' } =
      JSON.parse(event.body || '{}');

    if (!process.env.RESEND_API_KEY) {
      return json({ error: 'RESEND_API_KEY not configured' }, 500);
    }
    if (!process.env.FROM_EMAIL || !process.env.TO_EMAIL) {
      return json({ error: 'FROM_EMAIL or TO_EMAIL not configured' }, 500);
    }

    // Compose email
    const html = `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif">
        <h2>New Website Lead</h2>
        <p><strong>Name:</strong> ${escapeHtml(name) || '—'}</p>
        <p><strong>Email:</strong> ${escapeHtml(email) || '—'}</p>
        <p><strong>Phone:</strong> ${escapeHtml(phone) || '—'}</p>
        <p><strong>Source:</strong> ${escapeHtml(source) || '—'}</p>
        <p><strong>Site URL:</strong> ${escapeHtml(siteUrl) || '—'}</p>
        <p><strong>Message:</strong></p>
        <pre style="white-space:pre-wrap;background:#f6f8fa;padding:12px;border-radius:8px">${escapeHtml(message) || '—'}</pre>
      </div>
    `;

    // Send via Resend (no SDK needed)
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: process.env.FROM_EMAIL,
        to: [process.env.TO_EMAIL],
        subject: `New Lead: ${name || 'Website'}`,
        html,
        reply_to: email || undefined
      })
    });

    if (!r.ok) {
      const txt = await r.text();
      return json({ error: `Resend error: ${txt}` }, 502);
    }

    // Optional: forward to a Google Sheet (Apps Script web app URL)
    if (process.env.SHEETS_WEBHOOK) {
      try {
        await fetch(process.env.SHEETS_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            timestamp: new Date().toISOString(),
            name, email, phone, message, source, siteUrl
          })
        });
      } catch (e) {
        // Non-fatal
        console.warn('SHEETS_WEBHOOK forwarding failed', e);
      }
    }

    return json({ ok: true });
  } catch (err) {
    console.error(err);
    return json({ error: 'Invalid payload' }, 400);
  }
};

function json(obj, statusCode = 200) {
  return {
    statusCode,
    headers: corsHeaders(),
    body: JSON.stringify(obj)
  };
}
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization'
  };
}
function escapeHtml(s = '') {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
