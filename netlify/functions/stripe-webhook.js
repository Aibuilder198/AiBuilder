// netlify/functions/stripe-webhook.js
// Verify Stripe signature (manual HMAC), reconstruct HTML, email via Resend (no npm)

"use strict";

const crypto = require("crypto");

// ENV you must set in Netlify:
// STRIPE_WEBHOOK_SECRET, STRIPE_SECRET_KEY, RESEND_API_KEY, FROM_EMAIL
// (optional) SITE_URL

function timingSafeEqual(a, b) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

function parseStripeSig(header) {
  // header example: t=1696170000,v1=abcdef,v1=...
  const parts = (header || "").split(",").map((p) => p.trim());
  const out = { t: null, v1: [] };
  for (const p of parts) {
    const [k, v] = p.split("=");
    if (k === "t") out.t = v;
    if (k === "v1") out.v1.push(v);
  }
  return out;
}

function verifyStripeSignature(rawBody, sigHeader, webhookSecret) {
  const { t, v1 } = parseStripeSig(sigHeader);
  if (!t || !v1.length) return false;
  const payload = `${t}.${rawBody}`;
  const expected = crypto
    .createHmac("sha256", webhookSecret)
    .update(payload, "utf8")
    .digest("hex");
  // any of the v1 signatures may match
  return v1.some((s) => timingSafeEqual(s, expected));
}

function reconstructHTML(metadata) {
  if (!metadata || !metadata.html_parts) return null;
  const count = parseInt(metadata.html_parts, 10);
  let b64 = "";
  for (let i = 0; i < count; i++) b64 += metadata[`html_${i}`] || "";
  try {
    return decodeURIComponent(escape(Buffer.from(b64, "base64").toString("utf8")));
  } catch (e) {
    console.error("Failed to decode base64 HTML:", e);
    return null;
  }
}

async function sendWithResend({ to, subject, html, brandName }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.FROM_EMAIL || "no-reply@example.com";
  const siteUrl = process.env.SITE_URL || "";

  if (!apiKey) throw new Error("RESEND_API_KEY is not set");
  if (!to) throw new Error("Missing recipient email");
  if (!html) throw new Error("Missing HTML attachment");

  const bodyHtml = `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;line-height:1.5;color:#0f172a">
    <h2 style="margin:0 0 8px">Your website is ready 🎉</h2>
    <p style="margin:0 0 12px">
      Thanks for your purchase${brandName ? ` at <strong>${brandName}</strong>` : ""}!<br/>
      Your site has been generated and is attached as <code>site.html</code>.
    </p>
    <p style="margin:0 0 12px">
      <strong>How to use it:</strong><br/>
      1) Download the attachment<br/>
      2) (Optional) rename to <code>index.html</code><br/>
      3) Double-click to open, or upload to your hosting
    </p>
    ${siteUrl ? `<p style="margin:12px 0">Need help? Visit <a href="${siteUrl}" style="color:#2563eb;text-decoration:none">${siteUrl}</a></p>` : ""}
    <p style="margin:16px 0 0">— The Team</p>
  </div>`.trim();

  const attachmentB64 = Buffer.from(html, "utf8").toString("base64");

  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      html: bodyHtml,
      attachments: [{ filename: "site.html", content: attachmentB64 }],
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Resend error: ${resp.status} ${text}`);
  }
  return resp.json();
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: { Allow: "POST" }, body: "Method Not Allowed" };
  }

  try {
    const raw = event.body; // Netlify gives raw string
    const sig = event.headers["stripe-signature"];
    const secret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");

    const ok = verifyStripeSignature(raw, sig, secret);
    if (!ok) {
      console.error("Invalid Stripe signature");
      return { statusCode: 400, body: "Invalid signature" };
    }

    const stripeEvent = JSON.parse(raw);

    if (stripeEvent.type === "checkout.session.completed") {
      const session = stripeEvent.data.object || {};
      const metadata = session.metadata || {};
      const email =
        session.customer_details?.email || session.customer_email || null;

      const siteHTML = reconstructHTML(metadata);
      const brandName = metadata.businessName || "Your Business";

      if (siteHTML && email) {
        await sendWithResend({
          to: email,
          subject: `🎉 Your new website from ${brandName}`,
          html: siteHTML,
          brandName,
        });
        console.log("Website sent to:", email);
      } else {
        console.log("Missing siteHTML or customer email.");
      }
    } else {
      console.log("Unhandled event:", stripeEvent.type);
    }

    return { statusCode: 200, body: "ok" };
  } catch (err) {
    console.error("Webhook error:", err);
    return { statusCode: 500, body: "Internal Server Error" };
  }
};
