// netlify/functions/create-checkout.js
"use strict";

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: { Allow: "POST" }, body: "Method Not Allowed" };
  }

  try {
    const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
    if (!STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not set");

    const {
      items = [],
      mode = "payment",
      success_url,
      cancel_url,
      sitePayload = {},      // { businessName, description, htmlBase64 }
      client_reference_id,
      planName
    } = JSON.parse(event.body || "{}");

    if (!Array.isArray(items) || items.length === 0) {
      throw new Error("No items provided. Expected items: [{ price: 'price_...', quantity: 1 }]");
    }

    const origin = process.env.URL || "http://localhost:8888";
    const successURL = (success_url || `${origin}/success`) + `?session_id={CHECKOUT_SESSION_ID}`;
    const cancelURL  =  cancel_url  || `${origin}/cancel`;

    // Build metadata (<= 40 keys, <= 500 chars per key)
    const metadata = {};
    if (sitePayload.businessName) metadata.businessName = String(sitePayload.businessName).slice(0, 200);
    if (sitePayload.description)  metadata.description  = String(sitePayload.description).slice(0, 500);
    if (planName)                 metadata.planName     = String(planName).slice(0, 100);

    // Chunk the base64 HTML into metadata keys
    if (sitePayload.htmlBase64) {
      const s = String(sitePayload.htmlBase64);
      const SIZE = 480;                   // stay under 500/entry
      const MAX_KEYS = 48;                // stay under 40-50 total metadata keys
      const parts = [];
      for (let i = 0; i < s.length; i += SIZE) parts.push(s.slice(i, i + SIZE));
      const count = Math.min(parts.length, MAX_KEYS);
      for (let i = 0; i < count; i++) metadata[`html_${i}`] = parts[i];
      metadata.html_parts = String(count);
      metadata.html_encoding = "base64";
    }

    const body = new URLSearchParams();
    body.append("mode", mode === "subscription" ? "subscription" : "payment");
    body.append("success_url", successURL);
    body.append("cancel_url", cancelURL);
    if (client_reference_id) body.append("client_reference_id", client_reference_id);
    items.forEach((it, idx) => {
      body.append(`line_items[${idx}][price]`, it.price);
      body.append(`line_items[${idx}][quantity]`, String(it.quantity || 1));
    });
    Object.entries(metadata).forEach(([k, v]) => body.append(`metadata[${k}]`, v));

    const resp = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    const data = await resp.json();
    if (!resp.ok) {
      console.error("Stripe error:", data);
      return { statusCode: resp.status, body: JSON.stringify(data) };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: data.url, id: data.id }),
    };
  } catch (err) {
    console.error("create-checkout error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
