// netlify/functions/stripe-webhook.js
// Stripe webhook handler: reconstruct site HTML and email it to the customer

const Stripe = require("stripe");
const nodemailer = require("nodemailer");

// Make sure these environment variables are set in Netlify:
// STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, FROM_EMAIL
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2023-10-16",
});

/** Reconstruct a long string from chunked Stripe metadata */
function reconstructHTML(metadata) {
  if (!metadata || !metadata.html_parts) return null;
  const partsCount = parseInt(metadata.html_parts, 10);
  let full = "";
  for (let i = 0; i < partsCount; i++) {
    full += metadata[`html_${i}`] || "";
  }
  try {
    return decodeURIComponent(escape(Buffer.from(full, "base64").toString("utf8")));
  } catch (e) {
    console.error("Failed to decode HTML:", e);
    return null;
  }
}

async function sendEmail(to, subject, html) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const mail = {
    from: process.env.FROM_EMAIL || "no-reply@example.com",
    to,
    subject,
    text: "Attached is your generated website HTML.",
    attachments: [
      {
        filename: "site.html",
        content: html,
      },
    ],
  };

  return transporter.sendMail(mail);
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
    switch (stripeEvent.type) {
      case "checkout.session.completed": {
        const session = stripeEvent.data.object;
        const metadata = session.metadata || {};
        const customerEmail = session.customer_details?.email;

        console.log("Checkout completed for", customerEmail);

        const siteHTML = reconstructHTML(metadata);
        if (siteHTML && customerEmail) {
          await sendEmail(
            customerEmail,
            `Your new website from ${metadata.businessName || "AI Builder"}`,
            siteHTML
          );
          console.log("Website emailed to", customerEmail);
        }
        break;
      }
      default:
        console.log(`Unhandled event type ${stripeEvent.type}`);
    }

    return { statusCode: 200, body: "Success" };
  } catch (err) {
    console.error("Webhook handler error:", err);
    return { statusCode: 500, body: "Internal Server Error" };
  }
};
