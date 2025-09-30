document.getElementById("builderForm").addEventListener("submit", function (e) {
  e.preventDefault();
  const businessName = document.getElementById("businessName").value;
  const description = document.getElementById("description").value;

  alert(AI is generating a website for ${businessName}...\nDescription: ${description});
});

// Stripe Checkout button
document.getElementById("checkoutBtn").addEventListener("click", async () => {
  const response = await fetch("/.netlify/functions/create-checkout", {
    method: "POST",
  });
  const data = await response.json();
  window.location.href = data.url;
});