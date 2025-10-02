// netlify/functions/stripe-webhook.js
// Uses Stripe + Resend (no extra npm deps)

const Stripe = require("stripe");
const fetch = require("node-fetch"); // Node 18+ has global fetch; this is safe fallback

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2023-10-16",
});

function reconstructHTML(metadata) {
  if (!metadata || !metadata.html_parts) return null;
  const partsCount = parseInt(metadata.html_parts, 10);
  let full = "";
  for (let i = 0; i < partsCount; i++) {
    full += metadata[`html_${i}`] || "";
  }
  // decode base64 -> utf8
  try {
    return decodeURIComponent(
      escape(Buffer.from(full, "base64").toString("utf8"))
    );
  } catch (e) {
    console.error("Failed to decode HTML:", e);
    return null;
  }
}

async function sendWithResend({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.FROM_EMAIL || "no-reply@yourdomain.com";

  if (!apiKey) throw new Error("RESEND_API_KEY is not set");
  if (!to) throw new Error("Missing recipient email");

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
      html:
        "<p>Your generated website is attached as a file as well.</p>" +
        "<p>If the attachment doesn’t show, you can copy the HTML below into a file named <code>site.html</code> and open it.</p>",
      attachments: [
        {
          filename: "site.html",
          content: Buffer.from(html, "utf8").toString("base64"),
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
    if (stripeEvent.type === "checkout.session.completed") {
      const session = stripeEvent.data.object;
      const metadata = session.metadata || {};
      const customerEmail =
        session.customer_details?.email || session.customer_email;

      const html = reconstructHTML(metadata);
      if (html && customerEmail) {
        await sendWithResend({
          to: customerEmail,
          subject: `Your new website from ${
            metadata.businessName || "AI Builder"
          }`,
          html,
        });
        console.log("Website emailed to", customerEmail);
      } else {
        console.log("No HTML or customer email to send.");
      }
    } else {
      console.log("Unhandled event:", stripeEvent.type);
    }

    return { statusCode: 200, body: "ok" };
  } catch (err) {
    console.error("Webhook handler error:", err);
    return { statusCode: 500, body: "Internal Server Error" };
  }
};
