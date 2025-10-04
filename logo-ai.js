// /netlify/functions/ai-logo.js
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }
  try {
    const { brand="", slogan="", industry="", style="Minimal", colors="" } = JSON.parse(event.body || "{}");

    if (!process.env.OPENAI_API_KEY) {
      return { statusCode: 500, body: JSON.stringify({ error: "Missing OPENAI_API_KEY" }) };
    }

    // Build a prompt
    const colorHint = colors ? ` using colors ${colors}` : "";
    const prompt = `Design a clean, vector-like logo icon for a business.
Brand: ${brand}.
${slogan ? `Slogan: ${slogan}.` : ""}
Industry: ${industry}.
Style: ${style}.${colorHint}
No text, just the icon mark. Flat, high contrast, PNG with transparent background.`;

    // Call OpenAI Images (gpt-image-1)
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt,
        n: 3,
        size: "256x256",
        response_format: "b64_json"
      })
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("OpenAI error:", data);
      return { statusCode: 500, body: JSON.stringify({ error: data.error?.message || "OpenAI request failed" }) };
    }

    const images = (data.data || [])
      .map(d => `data:image/png;base64,${d.b64_json}`);

    return {
      statusCode: 200,
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify({ images })
    };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
