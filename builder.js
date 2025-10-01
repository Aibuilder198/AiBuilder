// Load meta.json dynamically
async function loadMeta() {
  try {
    const res = await fetch('/meta.json');
    if (!res.ok) throw new Error('meta.json missing');
    return await res.json();
  } catch (err) {
    console.warn('Using defaults, meta.json not found');
    return {
      siteName: "AI Website Builder",
      features: { builderForm: true, checkout: true },
      stripe: { priceId: "price_123", currency: "usd", amount: 2000 },
      messages: {
        success: "✅ Payment Successful! Your AI-generated website will be emailed shortly.",
        cancel: "❌ Payment Canceled. Please try again."
      }
    };
  }
}

// Main app logic
(async () => {
  const meta = await loadMeta();
  console.log("Loaded meta:", meta);

  // Form submit handler
  if (meta.features.builderForm) {
    document.getElementById("builderForm").addEventListener("submit", function (e) {
      e.preventDefault();
      const businessName = document.getElementById("businessName").value;
      const description = document.getElementById("description").value;

      alert(`AI is generating a website for ${businessName}...\nDescription: ${description}`);
    });
  }

  // Stripe Checkout button
  if (meta.features.checkout) {
    document.getElementById("checkoutBtn").addEventListener("click", async () => {
      const response = await fetch("/.netlify/functions/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ price: meta.stripe.priceId, quantity: 1 }],
          success_url: `${window.location.origin}/success`,
          cancel_url: `${window.location.origin}/cancel`
        })
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    });
  } else {
    // Hide checkout button if disabled in meta.json
    document.getElementById("checkoutBtn").style.display = "none";
  }
})();
