// Short helper
const byId = (id) => document.getElementById(id);

// Convert files to data URLs
async function fileToDataURL(file) {
  const reader = new FileReader();
  return new Promise((resolve, reject) => {
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Collect all form data
async function collectFormAsHTML() {
  const businessName = (byId("businessName")?.value || "").trim();
  const description  = (byId("description")?.value || "").trim();
  const brandColor   = byId("brandColor")?.value || "#0ea5e9";
  const theme        = byId("theme")?.value || "light";
  const font         = byId("font")?.value || "system-ui";
  const ctaText      = (byId("ctaText")?.value || "Contact Us").trim();
  const email        = (byId("email")?.value || "hello@example.com").trim();
  const phone        = (byId("phone")?.value || "").trim();
  const instagram    = (byId("instagram")?.value || "").trim();
  const servicesText = byId("services")?.value || "";
  const testimonialsText = byId("testimonials")?.value || "";
  const hoursText    = byId("hours")?.value || "";
  const address      = (byId("address")?.value || "").trim();

  // NEW: background + layout
  const bgType     = byId("bgType")?.value || "color";
  const bgColor    = byId("bgColor")?.value || "#f8fafc";
  const bgGradient = byId("bgGradient")?.value || "linear-gradient(135deg,#e0f2fe,#fce7f3)";
  const layout     = byId("layout")?.value || "classic";

  // Logo
  let logoDataURL = "";
  const logoInput = byId("logo");
  if (logoInput?.files?.[0]) logoDataURL = await fileToDataURL(logoInput.files[0]);

  // Gallery
  const galleryDataURLs = [];
  const galleryInput = byId("gallery");
  if (galleryInput?.files?.length) {
    const files = Array.from(galleryInput.files).slice(0, 12);
    for (const f of files) {
      if (f.size <= 1.5 * 1024 * 1024) {
        galleryDataURLs.push(await fileToDataURL(f));
      }
    }
  }

  // Background image
  let bgImageURL = "";
  const bgImage = byId("bgImage");
  if (bgImage?.files?.[0]) {
    bgImageURL = await fileToDataURL(bgImage.files[0]);
  }

  return buildSiteHTML({
    businessName, description, brandColor, theme, font,
    logoDataURL, galleryDataURLs,
    ctaText, email, phone, instagram,
    servicesText, testimonialsText, hoursText, address,
    bg: { type: bgType, color: bgColor, gradient: bgGradient, image: bgImageURL },
    layout
  });
}

// Handle form submit
byId("builderForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const siteHTML = await collectFormAsHTML();
  const blob = new Blob([siteHTML], { type: "text/html" });
  const url = URL.createObjectURL(blob);

  const preview = document.getElementById("previewArea");
  preview.innerHTML = `
    <p><strong>Preview:</strong></p>
    <iframe src="${url}" width="100%" height="600"></iframe>
    <a href="${url}" download="site.html" class="cta">Download Your Site</a>
  `;
});

// Stripe Checkout
byId("checkoutBtn").addEventListener("click", async () => {
  try {
    const siteHTML = await collectFormAsHTML();
    const response = await fetch("/.netlify/functions/create-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ html: siteHTML }),
    });
    const data = await response.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      alert("Checkout failed: " + JSON.stringify(data));
    }
  } catch (err) {
    console.error(err);
    alert("Checkout error: " + err.message);
  }
});
