// netlify/functions/stripe-webhook.js
// Stripe webhook -> reconstruct generated HTML -> email via Resend (no npm deps)

"use strict";

const Stripe = require("stripe");

// ENV VARS you must set in Netlify:
//  - STRIPE_SECRET_KEY
//  - STRIPE_WEBHOOK_SECRET
//  - RESEND_API_KEY
//  - FROM_EMAIL (a verified sender in Resend, e.g. no-reply@yourdomain.com)
// Optional:
//  - SITE_URL (for links in the email)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2023-10-16",
});

/** Rebuild long HTML from chunked Stripe metadata (html_0 ... html_N) */
function reconstructHTML(metadata) {
  if (!metadata || !metadata.html_parts) return null;
  const partsCount = parseInt(metadata.html_parts, 10);
  let b64 = "";
  for (let i = 0; i < partsCount; i++) {
    b64 += metadata[`html_${i}`] || "";
  }
  try {
    // decode base64 -> UTF-8
    return decodeURIComponent(escape(Buffer.from(b64, "base64").toString("utf8")));
  } catch (e) {
    console.error("Failed to decode HTML from metadata:", e);
    return null;
  }
}

/** Send email with Resend (uses global fetch available in Node 18+ on Netlify) */
async function sendWithResend({ to, subject, html, brandName }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.FROM_EMAIL || "no-reply@example.com";
  const siteUrl = process.env.SITE_URL || "";

  if (!apiKey) throw new Error("RESEND_API_KEY is not set");
  if (!to) throw new Error("Missing recipient email");
  if (!html) throw new Error("No HTML to send");

  // Simple branded HTML body (the full site is attached as site.html)
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
      2) Rename if you want (e.g. <code>index.html</code>)<br/>
      3) Double-click to open in your browser, or upload to your hosting
    </p>

    ${
      siteUrl
        ? `<p style="margin:12px 0">
             Need help or want upgrades? Visit:
             <a href="${siteUrl}" style="color:#2563eb;text-decoration:none">${siteUrl}</a>
           </p>`
        : ""
    }

    <p style="margin:16px 0 0">— The Team</p>
  </div>`.trim();

  // Resend expects base64 string in attachments.content
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
      // Attach the generated site as site.html
      attachments: [
        {
          filename: "site.html",
          content: attachmentB64,
        },
      ],
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Resend error: ${resp.status} ${text}`);
  }
  return resp.json();
}

exports.handler = async (event) => {
  // Stripe signature header
  const sig = event.headers["stripe-signature"];
  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  try {
    // Handle successful checkout (both one-time and subscription)
    if (stripeEvent.type === "checkout.session.completed") {
      const session = stripeEvent.data.object;
      const metadata = session.metadata || {};
      const customerEmail =
        session.customer_details?.email ||
        session.customer_email ||
        null;

      const siteHTML = reconstructHTML(metadata);
      const brandName = metadata.businessName || "Your Business";

      if (siteHTML && customerEmail) {
        await sendWithResend({
          to: customerEmail,
          subject: `🎉 Your new website from ${brandName}`,
          html: siteHTML,
          brandName,
        });
        console.log("Website sent to:", customerEmail);
      } else {
        console.log("Nothing to send (html or customer email missing).");
      }
    } else {
      // You can add more cases here if you want (e.g., invoice.paid)
      console.log("Unhandled event type:", stripeEvent.type);
    }

    return { statusCode: 200, body: "ok" };
  } catch (err) {
    console.error("Webhook handler error:", err);
    return { statusCode: 500, body: "Internal Server Error" };
  }
};
