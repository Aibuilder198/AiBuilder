/* ========= Config: Stripe Price IDs =========
   - BASIC: one-time $20 (mode: payment)
   - PRO:   $29/month     (mode: subscription)
   - BIZ:   $79/month     (mode: subscription)
   Replace with your real IDs (you provided these already)
*/
const STRIPE_PRICES = {
  basic: { price: "price_1SDFSNAmJkffDNdt0pAhcn8Y", mode: "payment" },     // $20 one-time
  pro:   { price: "price_1SDbHKAmJkffDNdtYP9sVw1T", mode: "subscription" }, // $29/month
  biz:   { price: "price_1SDbI1AmJkffDNdtjiqSI7qF", mode: "subscription" }, // $79/month
};

/* ========= Helpers ========= */
const byId = (id) => document.getElementById(id);

async function fileToDataURL(file) {
  const r = new FileReader();
  return new Promise((res, rej) => {
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}
const lines = (t) => (t || "").split(/\r?\n/).map(s => s.trim()).filter(Boolean);

/* ========= Fonts & Palettes ========= */
const GF = {
  "Inter": "Inter:wght@400;600;700",
  "Poppins": "Poppins:wght@400;600;700",
  "Playfair Display": "Playfair+Display:wght@400;600;700",
};

const PALETTES = {
  trust:    { brand: "#2563eb", accent: "#60a5fa", bg: "#f8fafc" },
  eco:      { brand: "#059669", accent: "#34d399", bg: "#f8fafc" },
  luxury:   { brand: "#b45309", accent: "#f59e0b", bg: "#fffbeb" },
  creative: { brand: "#7c3aed", accent: "#a78bfa", bg: "#faf5ff" },
  custom:   null, // uses brandColor input
};

/* ========= Plan gating =========
   - basic: single page, logo + up to 3 gallery images; NO services/testimonials/hours/maps/SEO/analytics/templates/palettes
   - pro:   unlock services/testimonials/hours/address/maps/formspree, 12 gallery images
   - biz:   unlock everything + template/palette/brandColor + SEO tags + analytics
*/
function getSelectedPlan() {
  const form = document.forms.planForm;
  const val = form?.plan?.value || "basic";
  if (val === "pro") return "pro";
  if (val === "business") return "biz";
  return "basic";
}

function applyPlanLocks() {
  const plan = getSelectedPlan();
  const proEnabled = plan === "pro" || plan === "biz";
  const bizEnabled = plan === "biz";

  // Design (Business)
  if (byId("template"))   byId("template").disabled   = !bizEnabled;
  if (byId("palette"))    byId("palette").disabled    = !bizEnabled;
  if (byId("brandColor")) byId("brandColor").disabled = !bizEnabled;

  // Content extras (Pro+)
  if (byId("services"))     byId("services").disabled     = !proEnabled;
  if (byId("testimonials")) byId("testimonials").disabled = !proEnabled;
  if (byId("hours"))        byId("hours").disabled        = !proEnabled;
  if (byId("address"))      byId("address").disabled      = !proEnabled;

  // Contact form (Pro+)
  if (byId("formspree")) byId("formspree").disabled = !proEnabled;

  // Growth (Business)
  if (byId("seoTitle"))       byId("seoTitle").disabled       = !bizEnabled;
  if (byId("seoDescription")) byId("seoDescription").disabled = !bizEnabled;
  if (byId("gaId"))           byId("gaId").disabled           = !bizEnabled;

  // Optional: subtle visual hint for disabled fields
  document.querySelectorAll("input,textarea,select").forEach(el => {
    if (el.disabled) el.classList.add("disabled");
    else el.classList.remove("disabled");
  });
}

/* ========= Site generator (photo background + sections) ========= */
function buildSiteHTML(opts) {
  const {
    // basics
    businessName, description,
    // design
    template, paletteKey, brandColor, font,
    // sections
    logoDataURL, galleryDataURLs = [],
    servicesText = "", testimonialsText = "", hoursText = "", address = "",
    // conversion
    ctaText, email, phone, instagram,
    // growth
    seoTitle, seoDescription, gaId,
    // form
    formspree
  } = opts;

  const services = lines(servicesText);
  const testimonials = lines(testimonialsText).map(row => {
    const [name, quote] = (row || "").split("|").map(s => s?.trim());
    return (name && quote) ? { name, quote } : null;
  }).filter(Boolean);
  const hours = lines(hoursText);

  const pal = PALETTES[paletteKey] || PALETTES.trust;
  const brand = paletteKey === "custom" ? (brandColor || "#0ea5e9") : (pal?.brand || "#2563eb");
  const accent = paletteKey === "custom" ? brand : (pal?.accent || "#60a5fa");

  const fontHref = GF[font] ? `https://fonts.googleapis.com/css2?family=${GF[font]}&display=swap` : "";
  const fontStack = font === "system-ui"
    ? "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif"
    : `'${font}', system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif`;

  const contactBits = [
    email ? `<a class="contact" href="mailto:${email}">Email: ${email}</a>` : "",
    phone ? `<span class="contact">Phone: ${phone}</span>` : "",
    instagram ? `<a class="contact" href="${instagram}" target="_blank" rel="noopener">Instagram</a>` : "",
  ].filter(Boolean).join(" ");

  const galleryHTML = galleryDataURLs.length ? `
    <section class="card">
      <h2>Gallery</h2>
      <div class="grid">
        ${galleryDataURLs.map(src => `<figure class="thumb"><img src="${src}" alt="Image"></figure>`).join("")}
      </div>
    </section>` : "";

  const servicesHTML = services.length ? `
    <section class="card">
      <h2>Services</h2>
      <ul class="list">${services.map(s => `<li>${s}</li>`).join("")}</ul>
    </section>` : "";

  const testimonialsHTML = testimonials.length ? `
    <section class="card">
      <h2>Testimonials</h2>
      <div class="testis">
        ${testimonials.map(t => `<blockquote><p>“${t.quote}”</p><footer>— ${t.name}</footer></blockquote>`).join("")}
      </div>
    </section>` : "";

  const hoursHTML = (hours.length || address) ? `
    <section class="card">
      <h2>Hours & Location</h2>
      ${hours.length ? `<ul class="list">${hours.map(h => `<li>${h}</li>`).join("")}</ul>` : ""}
      ${address ? `<p class="address">${address}</p>` : ""}
      ${address ? `<div class="mapWrap">
        <iframe
          title="Map"
          width="100%" height="280" loading="lazy" style="border:0; border-radius:12px"
          referrerpolicy="no-referrer-when-downgrade"
          src="https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed"></iframe>
      </div>` : ""}
    </section>` : "";

  const seoBlock = (seoTitle || seoDescription) ? `
  <meta property="og:title" content="${seoTitle || businessName}">
  <meta property="og:description" content="${seoDescription || description}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="description" content="${seoDescription || description}">
  <title>${seoTitle || businessName}</title>` : `<title>${businessName}</title>`;

  const analytics = gaId ? `
<script async src="https://www.googletagmanager.com/gtag/js?id=${gaId}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());gtag('config','${gaId}');</script>` : "";

  // Optional contact form (Formspree)
  const formHTML = formspree ? `
    <section class="card">
      <h2>Send us a message</h2>
      <form action="${formspree}" method="POST">
        <input type="text" name="name" placeholder="Your name" required style="display:block;width:100%;padding:10px;margin-bottom:8px;border-radius:8px;border:1px solid #e2e8f0;">
        <input type="email" name="email" placeholder="Your email" required style="display:block;width:100%;padding:10px;margin-bottom:8px;border-radius:8px;border:1px solid #e2e8f0;">
        <textarea name="message" placeholder="How can we help?" required style="display:block;width:100%;padding:10px;margin-bottom:8px;border-radius:8px;border:1px solid #e2e8f0;min-height:100px;"></textarea>
        <button type="submit" style="background:${brand};color:#fff;border:0;padding:10px 14px;border-radius:10px;cursor:pointer;">Send</button>
      </form>
    </section>` : "";

  // FINAL HTML (photo background)
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
${seoBlock}
${fontHref ? `<link href="${fontHref}" rel="stylesheet">` : ""}
<style>
  :root{ --brand:${brand}; --accent:${accent}; --ink:#0f172a; --muted:#475569; --card:#ffffff; }
  *{ box-sizing:border-box } html,body{ height:100% }
  body{
    margin:0; color:#fff; font-family:${fontStack};
    background:url("https://images.unsplash.com/photo-1503264116251-35a269479413?auto=format&fit=crop&w=1920&q=80")
              no-repeat center center fixed; background-size:cover;
  }
  .veil{ min-height:100%; background:linear-gradient(180deg,rgba(0,0,0,.35),rgba(0,0,0,.55));
         display:flex; flex-direction:column; }
  header.bar{ padding:22px 16px; display:flex; align-items:center; gap:12px; }
  header .logo{ height:44px; width:auto; border-radius:8px; background:#fff; padding:4px; box-shadow:0 4px 18px rgba(0,0,0,.25); }
  header h1{ margin:0; font-size:28px; text-shadow:0 2px 10px rgba(0,0,0,.4); }
  main{ max-width:1000px; width:100%; margin:24px auto 40px; padding:0 16px; }
  .card{ background:rgba(255,255,255,.92); color:var(--ink); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px);
         border-radius:14px; box-shadow:0 10px 30px rgba(0,0,0,.25); padding:22px; margin-bottom:22px; }
  .card.hero{ background:rgba(255,255,255,.96); }
  h2{ margin:0 0 10px; color:var(--ink); } p{ margin:0 0 8px }
  .cta{ display:inline-block; margin-top:12px; background:var(--brand); color:#fff; text-decoration:none;
        padding:10px 16px; border-radius:10px; box-shadow:0 6px 14px rgba(2,132,199,.35); }
  .grid{ display:grid; grid-template-columns:repeat(auto-fill,minmax(180px,1fr)); gap:12px; margin-top:10px; }
  .thumb{ border-radius:12px; overflow:hidden; background:#fff; box-shadow:0 2px 12px rgba(15,23,42,.2); }
  .thumb img{ width:100%; height:160px; object-fit:cover; display:block; }
  .list{ padding-left:18px; }
  .testis{ display:grid; gap:12px; }
  blockquote{ margin:0; padding:14px; background:#ffffff15; border-left:4px solid var(--brand); border-radius:10px; color:#111827; }
  blockquote p{ margin:0 0 6px } blockquote footer{ font-size:14px; color:#334155 }
  .contact{ display:inline-block; margin-right:12px; color:var(--brand); text-decoration:none; }
  .address{ margin-top:8px; color:#111827 }
  footer{ text-align:center; color:#e5e7eb; padding:24px 12px; text-shadow:0 2px 10px rgba(0,0,0,.4); }
  .mapWrap{ margin-top:10px; }
</style>
${analytics}
</head>
<body>
  <div class="veil">
    <header class="bar">
      ${logoDataURL ? `<img class="logo" src="${logoDataURL}" alt="Logo">` : ""}
      <h1>${businessName}</h1>
    </header>

    <main>
      <section class="card hero">
        <h2>About Us</h2>
        <p>${description}</p>
        <a class="cta" href="mailto:${email || "hello@example.com"}">${ctaText || "Contact Us"}</a>
      </section>

      ${servicesHTML}
      ${testimonialsHTML}
      ${galleryHTML}
      ${hoursHTML}
      ${formHTML}

      <section class="card">
        <h2>Contact</h2>
        ${contactBits || "<p style='color:#334155'>Reach out any time.</p>"}
      </section>
    </main>

    <footer>© ${new Date().getFullYear()} ${businessName}. All rights reserved.</footer>
  </div>
</body>
</html>`;
}

/* ========= Collect inputs (honor plan locks) ========= */
async function collectFormAsHTML() {
  const plan = getSelectedPlan();
  const proEnabled = plan === "pro" || plan === "biz";
  const bizEnabled = plan === "biz";

  const businessName = (byId("businessName")?.value || "").trim();
  const description  = (byId("description")?.value || "").trim();

  // Design (Business only)
  const template   = bizEnabled ? (byId("template")?.value || "modern") : "modern";
  const paletteKey = bizEnabled ? (byId("palette")?.value || "trust")  : "trust";
  const brandColor = bizEnabled ? (byId("brandColor")?.value || "#0ea5e9") : "#2563eb";
  const font       = "system-ui"; // keep simple

  // Assets
  let logoDataURL = "";
  const logoInput = byId("logo");
  if (logoInput?.files?.[0]) logoDataURL = await fileToDataURL(logoInput.files[0]);

  const galleryDataURLs = [];
  const galleryInput = byId("gallery");
  if (galleryInput?.files?.length) {
    const limit = proEnabled ? 12 : 3; // Basic=3, Pro/Biz=12
    const files = Array.from(galleryInput.files).slice(0, limit);
    for (const f of files) {
      if (f.size <= 1.5 * 1024 * 1024) galleryDataURLs.push(await fileToDataURL(f));
    }
  }

  // Content (Pro+)
  const servicesText     = proEnabled ? (byId("services")?.value || "") : "";
  const testimonialsText = proEnabled ? (byId("testimonials")?.value || "") : "";
  const hoursText        = proEnabled ? (byId("hours")?.value || "") : "";
  const address          = proEnabled ? (byId("address")?.value || "") : "";

  // Conversion
  const email     = (byId("email")?.value || "hello@example.com").trim();
  const phone     = (byId("phone")?.value || "").trim();
  const instagram = (byId("instagram")?.value || "").trim();
  const ctaText   = (byId("ctaText")?.value || "Contact Us").trim();

  // Growth (Business)
  const seoTitle       = bizEnabled ? (byId("seoTitle")?.value || "") : "";
  const seoDescription = bizEnabled ? (byId("seoDescription")?.value || "") : "";
  const gaId           = bizEnabled ? (byId("gaId")?.value || "") : "";

  // Formspree (Pro+)
  const formspree = proEnabled ? (byId("formspree")?.value || "") : "";

  return buildSiteHTML({
    businessName, description,
    template, paletteKey, brandColor, font,
    logoDataURL, galleryDataURLs,
    servicesText, testimonialsText, hoursText, address,
    ctaText, email, phone, instagram,
    seoTitle, seoDescription, gaId,
    formspree
  });
}

/* ========= Wire up plan locks on page load & change ========= */
document.addEventListener("DOMContentLoaded", () => {
  applyPlanLocks();
  document.forms.planForm?.addEventListener("change", applyPlanLocks);
});

/* ========= Generate Website (preview only; no download link) ========= */
byId("builderForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const html = await collectFormAsHTML();
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const preview = byId("previewArea");
    preview.innerHTML = `
      <p><strong>Preview (not downloadable):</strong></p>
      <iframe src="${url}" width="100%" height="620" style="border:1px solid #e2e8f0;border-radius:12px;"></iframe>
      <p style="margin-top:8px;color:#475569">
        Want the file? Choose a plan and complete checkout — you’ll unlock the download on the success page.
      </p>
    `;
  } catch (err) {
    console.error(err);
    alert("Could not generate site. See console for details.");
  }
});

/* ========= Stripe checkout (Buy Selected Plan) ========= */
byId("checkoutBtn").addEventListener("click", async () => {
  const plan = getSelectedPlan();
  const cfg = (plan === "pro") ? STRIPE_PRICES.pro : (plan === "biz") ? STRIPE_PRICES.biz : STRIPE_PRICES.basic;

  try {
    const html = await collectFormAsHTML();
    const res = await fetch("/.netlify/functions/create-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ price: cfg.price, quantity: 1 }],
        mode: cfg.mode, // 'payment' or 'subscription'
        // success/cancel URLs set server-side to include ?session_id=...
        sitePayload: {
          businessName: byId("businessName")?.value || "",
          description: byId("description")?.value || "",
          htmlBase64: btoa(unescape(encodeURIComponent(html)))
        },
        planName: plan
      })
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text);
    }
    const data = await res.json();
    if (data?.url) {
      window.location.href = data.url; // Redirect to Stripe Checkout
    } else {
      alert("Checkout failed (no URL).");
    }
  } catch (err) {
    console.error("Checkout error:", err);
    alert("Checkout failed. See console for details.");
  }
});
