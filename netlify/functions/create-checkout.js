// netlify/functions/create-checkout.js
// Create Stripe Checkout Session via HTTPS (no npm deps)

"use strict";

const qs = (obj) =>
  Object.entries(obj)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: { Allow: "POST" }, body: "Method Not Allowed" };
  }

  try {
    const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
    if (!STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not set");

    const {
      items = [],                 // [{ price: "...", quantity: 1 }]
      mode = "payment",           // "payment" | "subscription"
      success_url,
      cancel_url,
      sitePayload = {},           // { businessName, description, htmlBase64 }
      client_reference_id,
      planName
    } = JSON.parse(event.body || "{}");

    if (!Array.isArray(items) || items.length === 0) {
      throw new Error("No items provided. Expected items: [{ price: 'price_...', quantity: 1 }]");
    }

    const origin = process.env.URL || "http://localhost:8888";
    const successURL = success_url || `${origin}/success`;
    const cancelURL  = cancel_url  || `${origin}/cancel`;

    // Build metadata (Stripe limit: max 40 keys)
    const metadata = {};
    if (sitePayload.businessName) metadata.businessName = String(sitePayload.businessName).slice(0, 200);
    if (sitePayload.description)  metadata.description  = String(sitePayload.description).slice(0, 500);
    if (planName)                 metadata.planName     = String(planName).slice(0, 100);

    // Chunk the generated HTML (base64) into metadata keys
    if (sitePayload.htmlBase64) {
      const s = String(sitePayload.htmlBase64);
      const size = 480; // conservative per-key size
      const parts = [];
      for (let i = 0; i < s.length; i += size) parts.push(s.slice(i, i + size));
      const max = Math.min(parts.length, 48);
      for (let i = 0; i < max; i++) metadata[`html_${i}`] = parts[i];
      metadata.html_parts = String(max);
      metadata.html_encoding = "base64";
    }

    // Stripe expects application/x-www-form-urlencoded
    const body = new URLSearchParams();
    body.append("mode", mode === "subscription" ? "subscription" : "payment");
    body.append("success_url", successURL);
    body.append("cancel_url", cancelURL);
    if (client_reference_id) body.append("client_reference_id", client_reference_id);

    // line_items array
    items.forEach((it, idx) => {
      body.append(`line_items[${idx}][price]`, it.price);
      body.append(`line_items[${idx}][quantity]`, String(it.quantity || 1));
    });

    // metadata fields
    Object.entries(metadata).forEach(([k, v]) => {
      body.append(`metadata[${k}]`, String(v));
    });

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
