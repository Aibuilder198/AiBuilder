// builder.js
// Controls the AI Website Builder frontend: preview, checkout, download

// --- STRIPE CONFIG ---
const stripe = Stripe("pk_test_1234567890"); // Replace with your real publishable key

// --- PLAN PRICE IDs ---
const PLAN_PRICES = {
  basic_one_time: "price_20dollarOneTimeID",  // Replace with your real $20 one-time price
  pro_monthly: "price_1SDbHKAmJkffDNdtYP9sVw1T", // $29/month
  biz_monthly: "price_1SDbI1AmJkffDNdtjiqSI7qF"  // $79/month
};

// --- DOM ELEMENTS ---
const previewBtn = document.getElementById("previewBtn");
const buyBtn = document.getElementById("buyBtn");
const downloadBtn = document.getElementById("downloadBtn");
const previewDiv = document.getElementById("preview");

// --- COLLECT USER DATA ---
function collectSiteData() {
  return {
    businessName: document.getElementById("businessName").value || "My Business",
    businessDesc: document.getElementById("businessDesc").value || "Business description here.",
    services: (document.getElementById("services").value || "")
      .split("\n").filter(Boolean),
    testimonials: (document.getElementById("testimonials").value || "")
      .split("\n").filter(Boolean),
    seoTitle: document.getElementById("seoTitle").value || "",
    seoDesc: document.getElementById("seoDesc").value || ""
  };
}

// --- GENERATE PREVIEW ---
function generatePreview() {
  const data = collectSiteData();

  let servicesHTML = data.services.map(s => `<li>${s}</li>`).join("");
  let testimonialsHTML = data.testimonials
    .map(t => {
      let [name, quote] = t.split("|").map(x => x.trim());
      if (!name || !quote) return "";
      return `<blockquote>"${quote}" — <strong>${name}</strong></blockquote>`;
    })
    .join("");

  previewDiv.innerHTML = `
    <h2>${data.businessName}</h2>
    <p>${data.businessDesc}</p>
    ${servicesHTML ? `<h3>Services</h3><ul>${servicesHTML}</ul>` : ""}
    ${testimonialsHTML ? `<h3>Testimonials</h3>${testimonialsHTML}` : ""}
    ${data.seoTitle ? `<p><em>SEO Title: ${data.seoTitle}</em></p>` : ""}
    ${data.seoDesc ? `<p><em>SEO Description: ${data.seoDesc}</em></p>` : ""}
  `;
}

// --- STRIPE CHECKOUT ---
async function startCheckout() {
  const plan = document.querySelector('input[name="plan"]:checked').value;

  try {
    buyBtn.disabled = true;
    buyBtn.textContent = "Redirecting…";

    const res = await fetch("/.netlify/functions/create-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        priceId: PLAN_PRICES[plan],
        meta: JSON.stringify(collectSiteData())
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Checkout failed");

    // Redirect to Stripe Checkout
    await stripe.redirectToCheckout({ sessionId: data.id });

  } catch (err) {
    alert("Failed to start checkout: " + err.message);
  } finally {
    buyBtn.disabled = false;
    buyBtn.textContent = "Buy & Unlock";
  }
}

// --- VERIFY PAYMENT & DOWNLOAD ---
async function downloadSite() {
  try {
    const res = await fetch("/.netlify/functions/verify-session");
    const data = await res.json();

    if (!data.verified) {
      alert("❌ You need to purchase a plan to download your site.");
      return;
    }

    // Generate site export (simple HTML file for now)
    const htmlContent = `
      <!doctype html>
      <html><head>
        <meta charset="utf-8">
        <title>${document.getElementById("businessName").value || "Website"}</title>
        <meta name="description" content="${document.getElementById("seoDesc").value || ""}">
      </head>
      <body>
        ${previewDiv.innerHTML}
      </body></html>
    `;

    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "website.html";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

  } catch (err) {
    alert("Error verifying payment: " + err.message);
  }
}

// --- EVENT LISTENERS ---
if (previewBtn) previewBtn.addEventListener("click", (e) => { e.preventDefault(); generatePreview(); });
if (buyBtn) buyBtn.addEventListener("click", (e) => { e.preventDefault(); startCheckout(); });
if (downloadBtn) downloadBtn.addEventListener("click", (e) => { e.preventDefault(); downloadSite(); });

// Initial
console.log("Builder.js loaded");
