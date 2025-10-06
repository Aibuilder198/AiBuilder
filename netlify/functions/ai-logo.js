// /netlify/functions/ai-logo.js
// Requires: OPENAI_API_KEY in your Netlify environment
// And "openai" dependency in package.json

import OpenAI from "openai";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  try {
    const { brand, slogan, industry, style, colors } = JSON.parse(event.body || "{}");

    if (!process.env.OPENAI_API_KEY) {
      return { statusCode: 500, body: JSON.stringify({ error: "OPENAI_API_KEY not set" }) };
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Compose a simple prompt for a logo
    const prompt = `
      Create a simple, clean logo for a small business.
      Brand: ${brand || "My Brand"}
      Slogan: ${slogan || ""}
      Industry: ${industry || ""}
      Style: ${style || "Minimal"}
      Colors: ${colors || "brand-appropriate"}
      Flat vector, on solid background, centered, no text artifacts.
    `;

    // gpt-image-1 creates base64 PNGs
    const resp = await client.images.generate({
      model: "gpt-image-1",
      prompt,
      size: "256x256",
      n: 4
    });

    const images = (resp.data || [])
      .map(d => d.b64_json)
      .filter(Boolean)
      .map(b64 => `data:image/png;base64,${b64}`);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ images })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message || "AI logo error" }) };
  }
};
