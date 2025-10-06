// /netlify/functions/ai-logo.js
// Requires: OPENAI_API_KEY in your Netlify env (Site settings → Environment variables)
// Also ensure "openai" is in your package.json dependencies.

import OpenAI from "openai";

const json = (statusCode, bodyObj) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    "Cache-Control": "no-store"
  },
  body: JSON.stringify(bodyObj)
});

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      },
      body: ""
    };
  }

  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method Not Allowed" });
  }

  try {
    if (!process.env.OPENAI_API_KEY) {
      return json(500, { error: "OPENAI_API_KEY not set" });
    }

    const { brand, slogan, industry, style, colors } = JSON.parse(event.body || "{}");

    const prompt = `
Create a simple, clean logo for a small business.

Brand: ${brand || "My Brand"}
Slogan: ${slogan || ""}
Industry: ${industry || ""}
Style: ${style || "Minimal"}
Preferred Colors: ${colors || "brand-appropriate"}

Guidelines:
- Flat vector style, centered on a solid background
- Balanced composition, crisp edges
- No small unreadable text, no text artifacts
- Suitable as a square app/logo mark
`;

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // NOTE: 256x256 is no longer supported. Use one of:
    // "1024x1024", "1024x1536", "1536x1024", or "auto"
    const resp = await client.images.generate({
      model: "gpt-image-1",
      prompt,
      size: "1024x1024",
      n: 4
    });

    const images = (resp.data || [])
      .map(d => d.b64_json)
      .filter(Boolean)
      .map(b64 => `data:image/png;base64,${b64}`);

    return json(200, { images });
  } catch (err) {
    console.error("ai-logo error:", err);
    return json(500, { error: err?.message || "AI logo generation failed" });
  }
};
