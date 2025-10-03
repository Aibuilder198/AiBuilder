/* ========= Config: Stripe Price IDs ========= */
const STRIPE_PRICES = {
  basic: { price: "price_1SDFSNAmJkffDNdt0pAhcn8Y", mode: "payment" },     // $20 one-time
  pro:   { price: "price_1SDbHKAmJkffDNdtYP9sVw1T", mode: "subscription" }, // $29/month
  biz:   { price: "price_1SDbI1AmJkffDNdtjiqSI7qF", mode: "subscription" }  // $79/month
};

const byId = (id) => document.getElementById(id);

async function fileToDataURL(file) {
  const r = new FileReader();
  return new Promise((res, rej) => { r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
}
const lines = (t) => (t || "").split(/\r?\n/).map(s => s.trim()).filter(Boolean);

/* ====== minimal palette/font just like before ====== */
function buildSiteHTML(opts) {
  const {
    businessName, description, logoDataURL, galleryDataURLs = [],
    servicesText = "", testimonialsText = "", hoursText = "", address = "",
    ctaText, email, phone, instagram
  } = opts;

  const services = lines(servicesText);
  const testimonials = lines(testimonialsText).map(row => {
    const [name, quote] = (row || "").split("|").map(s => s?.trim());
    return (name && quote) ? { name, quote } : null;
  }).filter(Boolean);
  const hours = lines(hoursText);

  const contactBits = [
    email ? `<a class="contact" href="mailto:${email}">Email: ${email}</a>` : "",
    phone ? `<span class="contact">Phone: ${phone}</span>` : "",
    instagram ? `<a class="contact" href="${instagram}" target="_blank" rel="noopener">Instagram</a>` : "",
  ].filter(Boolean).join(" ");

  const galleryHTML = galleryDataURLs.length ? `
    <section class="card">
      <h2>Gallery</h2>
      <div class="grid">
        ${galleryDataURLs.map(src => `<figure class="thumb"><img src="${src}" alt=""></figure>`).join("")}
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
      <div class="testis">${testimonials.map(t => `<blockquote><p>“${t.quote}”</p><footer>— ${t.name}</footer></blockquote>`).join("")}</div>
    </section>` : "";

  const hoursHTML = (hours.length || address) ? `
    <section class="card">
      <h2>Hours & Location</h2>
      ${hours.length ? `<ul class="list">${hours.map(h => `<li>${h}</li>`).join("")}</ul>` : ""}
      ${address ? `<p class="address">${address}</p>` : ""}
      ${address ? `<div class="mapWrap"><iframe title="Map" width="100%" height="280" loading="lazy" style="border:0;border-radius:12px"
        src="https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed"></iframe></div>` : ""}
    </section>` : "";

  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${businessName}</title>
<style>
  :root{ --brand:#2563eb; --ink:#0f172a }
  *{ box-sizing:border-box } html,body{ height:100% } body{
    margin:0;color:#fff;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
    background:url("https://images.unsplash.com/photo-1503264116251-35a269479413?auto=format&fit=crop&w=1920&q=80") no-repeat center/cover fixed;
  }
  .veil{ min-height:100%; background:linear-gradient(180deg,rgba(0,0,0,.35),rgba(0,0,0,.55)); display:flex; flex-direction:column; }
  header{ padding:22px 16px; display:flex; align-items:center; gap:12px; }
  header .logo{ height:44px; background:#fff; padding:4px; border-radius:8px }
  header h1{ margin:0; font-size:28px; text-shadow:0 2px 10px rgba(0,0,0,.4) }
  main{ max-width:1000px; width:100%; margin:24px auto 40px; padding:0 16px }
  .card{ background:rgba(255,255,255,.92); color:var(--ink); backdrop-filter:blur(6px); border-radius:14px; box-shadow:0 10px 30px rgba(0,0,0,.25); padding:22px; margin-bottom:22px }
  .card.hero{ background:rgba(255,255,255,.96) }
  .cta{ display:inline-block; margin-top:12px; background:var(--brand); color:#fff; padding:10px 16px; border-radius:10px; text-decoration:none }
  .grid{ display:grid; grid-template-columns:repeat(auto-fill,minmax(180px,1fr)); gap:12px; margin-top:10px }
  .thumb{ border-radius:12px; overflow:hidden; background:#fff }
  .thumb img{ width:100%; height:160px; object-fit:cover; display:block }
  .list{ padding-left:18px } .testis{ display:grid; gap:12px }
  blockquote{ margin:0; padding:14px; background:#ffffff15; border-left:4px solid var(--brand); border-radius:10px; color:#111827 }
  .contact{ display:inline-block; margin-right:12px; color:var(--brand) }
  footer{ text-align:center; color:#e5e7eb; padding:24px 12px; text-shadow:0 2px 10px rgba(0,0,0,.4) }
</style>
</head><body><div class="veil">
<header>
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
  <section class="card"><h2>Contact</h2>${contactBits || "<p>Reach out any time.</p>"}</section>
</main>
<footer>© ${new Date().getFullYear()} ${businessName}. All rights reserved.</footer>
</div></body></html>`;
}

/* ======= form collection (trimmed) ======= */
async function collectFormAsHTML() {
  const businessName = (byId("businessName")?.value || "").trim();
  const description  = (byId("description")?.value || "").trim();
  const email        = (byId("email")?.value || "").trim();
  const phone        = (byId("phone")?.value || "").trim();
  const instagram    = (byId("instagram")?.value || "").trim();
  const ctaText      = (byId("ctaText")?.value || "Contact Us").trim();

  let logoDataURL = "";
  const logoInput = byId("logo");
  if (logoInput?.files?.[0]) logoDataURL = await fileToDataURL(logoInput.files[0]);

  const galleryDataURLs = [];
  const galleryInput = byId("gallery");
  if (galleryInput?.files?.length) {
    const files = Array.from(galleryInput.files).slice(0, 6); // keep preview snappy
    for (const f of files) {
      if (f.size <= 1.5 * 1024 * 1024) galleryDataURLs.push(await fileToDataURL(f));
    }
  }

  const servicesText     = byId("services")?.value || "";
  const testimonialsText = byId("testimonials")?.value || "";
  const hoursText        = byId("hours")?.value || "";
  const address          = byId("address")?.value || "";

  return buildSiteHTML({
    businessName, description, logoDataURL, galleryDataURLs,
    servicesText, testimonialsText, hoursText, address,
    ctaText, email, phone, instagram
  });
}

/* ======= Save to localStorage helper ======= */
function saveSiteToLocalStorage(html) {
  try {
    const b64 = btoa(unescape(encodeURIComponent(html)));
    localStorage.setItem("site_html_base64", b64);
  } catch (e) {
    console.warn("Could not store site in localStorage:", e);
  }
}

/* ======= Preview ======= */
byId("builderForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const html = await collectFormAsHTML();
    saveSiteToLocalStorage(html);

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const preview = byId("previewArea");
    preview.innerHTML = `
      <p><strong>Preview (not downloadable):</strong></p>
      <iframe src="${url}" width="100%" height="620" style="border:1px solid #e2e8f0;border-radius:12px;"></iframe>
      <p style="margin-top:8px;color:#475569">
        Want the file? Choose a plan and complete checkout — you’ll unlock the download on the success page.
      </p>`;
  } catch (err) {
    console.error(err);
    alert("Could not generate site.");
  }
});

/* ======= Plan picker ======= */
function getSelectedPlan() {
  const form = document.forms.planForm;
  const val = form?.plan?.value || "basic";
  if (val === "pro") return "pro";
  if (val === "business") return "biz";
  return "basic";
}

/* ======= Checkout ======= */
byId("checkoutBtn").addEventListener("click", async () => {
  const plan = getSelectedPlan();
  const cfg = (plan === "pro") ? STRIPE_PRICES.pro : (plan === "biz") ? STRIPE_PRICES.biz : STRIPE_PRICES.basic;

  try {
    const html = await collectFormAsHTML();
    saveSiteToLocalStorage(html); // ensure it’s saved before redirect

    const res = await fetch("/.netlify/functions/create-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ price: cfg.price, quantity: 1 }],
        mode: cfg.mode,
        // We no longer send the site content to Stripe at all
        sitePayload: {
          businessName: byId("businessName")?.value || "",
          description: byId("description")?.value || ""
        },
        planName: plan
      })
    });

    const data = await res.json();
    if (!res.ok || !data?.url) throw new Error(data?.error || "No checkout URL.");
    window.location.href = data.url;
  } catch (err) {
    console.error("Checkout error:", err);
    alert("Checkout failed. See console for details.");
  }
});
