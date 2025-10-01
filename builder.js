// Form submit handler
document.getElementById("builderForm").addEventListener("submit", function (e) {
  e.preventDefault();
  const businessName = document.getElementById("businessName").value;
  const description = document.getElementById("description").value;

  alert(`AI is generating a website for ${businessName}...\nDescription: ${description}`);
});

// Stripe Checkout button
document.getElementById("checkoutBtn").addEventListener("click", async () => {
  const response = await fetch("/.netlify/functions/create-checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [{ price: "price_123", quantity: 1 }], // replace with your Stripe price ID(s)
      success_url: `${window.location.origin}/success`,
      cancel_url: `${window.location.origin}/cancel`
    })
  });

  const data = await response.json();
  if (data.url) {
    window.location.href = data.url;
  }
});
