/* ========= Stripe Price IDs ========= */
const STRIPE_PRICES = {
  basic: { price: "price_1SDFSNAmJkffDNdt0pAhcn8Y", mode: "payment" },     // $20 one-time
  pro:   { price: "price_1SDbHKAmJkffDNdtYP9sVw1T", mode: "subscription" }, // $29/mo
  biz:   { price: "price_1SDbI1AmJkffDNdtjiqSI7qF", mode: "subscription" }  // $79/mo
};

const byId = (id) => document.getElementById(id);

/* ====== Plan detection & locks ====== */
function currentPlan() {
  const chosen =
    document.querySelector('input[name="plan"]:checked')?.value ||
    document.getElementById('plan')?.value ||
    'basic';
  const v = String(chosen).toLowerCase();
  if (['business', 'biz', 'business-monthly', 'enterprise'].includes(v)) return 'biz';
  if (['pro', 'professional'].includes(v)) return 'pro';
  return 'basic';
}
function toggleFields(ids, enabled) {
  ids.forEach((id) => {
    const el = byId(id);
    if (!el) return;
    el.disabled = !enabled;
    el.classList.toggle('disabled', !enabled);
  });
}
function applyPlanLocks() {
  const plan = currentPlan();
  const proEnabled = plan === 'pro' || plan === 'biz';
  const bizEnabled = plan === 'biz';
  // Pro
  toggleFields(['services', 'testimonials', 'hours', 'address', 'formspree'], proEnabled);
  // Business
  toggleFields(['template', 'palette', 'brandColor', 'seoTitle', 'seoDescription', 'gaId'], bizEnabled);
  // Badge
  const badge = byId('planBadge');
  if (badge) badge.textContent = plan === 'biz' ? 'Business' : (plan === 'pro' ? 'Pro' : 'Basic');
}
document.addEventListener('DOMContentLoaded', () => {
  applyPlanLocks();
  document.addEventListener('change', (e) => {
    if (e.target.matches('input[name="plan"], #plan')) applyPlanLocks();
  });
});

/* ====== BG controls visibility ====== */
function show(el, yes){ if(!el) return; el.classList[yes ? 'remove' : 'add']('hide'); }
function updateBgUI() {
  const type = byId('bgType')?.value || 'default';
  show(byId('bgUploadRow'),   type === 'image-upload');
  show(byId('bgUrlRow'),      type === 'image-url');
  show(byId('bgGradientRow'), type === 'gradient');
  show(byId('bgSolidRow'),    type === 'solid');
}
document.addEventListener('change', (e)=>{
  if (e.target.id === 'bgType') updateBgUI();
});
document.addEventListener('DOMContentLoaded', updateBgUI);

/* ====== Utils ====== */
async function fileToDataURL(file) {
  const r = new FileReader();
  return new Promise((res, rej) => { r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
}
const lines = (t) => (t || "").split(/\r?\n/).map(s => s.trim()).filter(Boolean);

/* ====== Build site HTML with customizable background ====== */
function buildBackgroundCSS(bg) {
  const overlayAlpha = Math.max(0, Math.min(0.9, bg.overlay)); // 0..0.9
  if (bg.type === 'image-upload' || bg.type === 'image-url') {
    const img = bg.image || "https://images.unsplash.com/photo-1520975922326-0f1f1a6f63e0?q=80&w=1920&auto=format&fit=crop";
    return `
      body{
        margin:0;color:#fff;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
        background:
          linear-gradient(180deg, rgba(0,0,0,${overlayAlpha}), rgba(0,0,0,${overlayAlpha})),
          url("${img}") no-repeat center/cover fixed;
      }`;
  }
  if (bg.type === 'gradient') {
    return `
      body{
        margin:0;color:#fff;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
        background: radial-gradient(1200px 800px at 10% -10%, ${bg.color1}, transparent 60%),
                    radial-gradient(1000px 700px at 90% 110%, ${bg.color2}, transparent 60%),
                    #0b1221;
      }`;
  }
  if (bg.type === 'solid') {
    return `
      body{
        margin:0;color:#fff;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
        background: ${bg.solid};
      }`;
  }
  // default
  return `
    body{
      margin:0;color:#fff;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
      background:
        linear-gradient(180deg, rgba(8,13,25,.75), rgba(8,13,25,.85)),
        url("https://images.unsplash.com/photo-1520975922326-0f1f1a6f63e0?q=80&w=1920&auto=format&fit=crop")
        no-repeat center/cover fixed;
    }`;
}

function buildSiteHTML(opts) {
  const {
    businessName, description, logoDataURL, galleryDataURLs = [],
    servicesText = "", testimonialsText = "", hoursText = "", address = "",
    ctaText, email, phone, instagram,
    bg // {type, image, color1, color2, solid, overlay}
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
  *{ box-sizing:border-box } html,body{ height:100% }
  ${buildBackgroundCSS(bg)}
  .veil{ min-height:100%; background:linear-gradient(180deg,rgba(0,0,0,.0),rgba(0,0,0,.25)); display:flex; flex-direction:column; }
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

/* ====== Gather fields (includes background) ====== */
async function collectFormAsHTML() {
  const plan = currentPlan();
  const proEnabled = plan === "pro" || plan === "biz";

  const businessName = (byId("businessName")?.value || "").trim();
  const description  = (byId("description")?.value || "").trim();
  const email        = (byId("email")?.value || "").trim();
  const phone        = (byId("phone")?.value || "").trim();
  const instagram    = (byId("instagram")?.value || "").trim();
  const ctaText      = (byId("ctaText")?.value || "Contact Us").trim();

  // Logo
  let logoDataURL = "";
  const logoInput = byId("logo");
  if (logoInput?.files?.[0]) logoDataURL = await fileToDataURL(logoInput.files[0]);

  // Gallery
  const galleryDataURLs = [];
  const galleryInput = byId("gallery");
  if (galleryInput?.files?.length) {
    const files = Array.from(galleryInput.files).slice(0, 6);
    for (const f of files) {
      if (f.size <= 1.5 * 1024 * 1024) galleryDataURLs.push(await fileToDataURL(f));
    }
  }

  // Background
  const bgType = byId("bgType")?.value || "default";
  let bgImage = "";
  if (bgType === "image-upload") {
    const f = byId("bgUpload")?.files?.[0];
    if (f) bgImage = await fileToDataURL(f);
  } else if (bgType === "image-url") {
    bgImage = (byId("bgUrl")?.value || "").trim();
  }
  const bgOverlayPct = parseInt(byId("bgOverlay")?.value || "55", 10);
  const bg = {
    type: bgType,
    image: bgImage,
    color1: byId("bgColor1")?.value || "#0ea5e9",
    color2: byId("bgColor2")?.value || "#2563eb",
    solid: byId("bgSolid")?.value || "#0b1221",
    overlay: isNaN(bgOverlayPct) ? 0.55 : Math.max(0, Math.min(0.9, bgOverlayPct / 100))
  };

  // Pro fields
  const servicesText     = proEnabled ? (byId("services")?.value || "") : "";
  const testimonialsText = proEnabled ? (byId("testimonials")?.value || "") : "";
  const hoursText        = proEnabled ? (byId("hours")?.value || "") : "";
  const address          = proEnabled ? (byId("address")?.value || "") : "";

  return buildSiteHTML({
    businessName, description, logoDataURL, galleryDataURLs,
    servicesText, testimonialsText, hoursText, address,
    ctaText, email, phone, instagram,
    bg
  });
}

/* ====== Local save (for success download) ====== */
function saveSiteToLocalStorage(html) {
  try {
    const b64 = btoa(unescape(encodeURIComponent(html)));
    localStorage.setItem("site_html_base64", b64);
  } catch (e) {
    console.warn("Could not store site in localStorage:", e);
  }
}

/* ====== Preview ====== */
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
      <p style="margin-top:8px;color:#e5e7eb">
        Want the file? Choose a plan and complete checkout — you’ll unlock the download on the success page.
      </p>`;
  } catch (err) {
    console.error(err);
    alert("Could not generate site. See console for details.");
  }
});

/* ====== Checkout ====== */
function selectedPlanConfig() {
  const plan = currentPlan();
  return plan === "pro" ? STRIPE_PRICES.pro : (plan === "biz" ? STRIPE_PRICES.biz : STRIPE_PRICES.basic);
}
byId("checkoutBtn").addEventListener("click", async () => {
  const cfg = selectedPlanConfig();
  try {
    const html = await collectFormAsHTML();
    saveSiteToLocalStorage(html);

    const res = await fetch("/.netlify/functions/create-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ price: cfg.price, quantity: 1 }],
        mode: cfg.mode,
        sitePayload: {
          businessName: byId("businessName")?.value || "",
          description: byId("description")?.value || ""
        },
        planName: currentPlan()
      })
    });

    const data = await res.json();
    if (!res.ok || !data?.url) throw new Error(data?.error || "No checkout URL returned.");
    window.location.href = data.url;
  } catch (err) {
    console.error("Checkout error:", err);
    alert("Checkout failed. See console for details.");
  }
});

/* ===== Pricing Modal ===== */
const pricingData = [
  {
    key: 'basic',
    name: 'Basic',
    price: '$20',
    pill: 'one-time',
    bullets: [
      { ok:true,  text:'Downloadable website after payment' },
      { ok:true,  text:'Logo + up to a few gallery images' },
      { ok:true,  text:'Clean, modern single-page layout' },
      { ok:false, text:'Services, Testimonials, Hours/Location' },
      { ok:false, text:'Custom themes / palette / brand color' },
      { ok:false, text:'SEO fields & Analytics' },
    ]
  },
  {
    key: 'pro',
    name: 'Pro',
    price: '$29.00',
    pill: 'per month',
    bullets: [
      { ok:true,  text:'Everything in Basic' },
      { ok:true,  text:'Services, Testimonials, Hours/Location' },
      { ok:true,  text:'Contact form ready (Formspree)' },
      { ok:true,  text:'Priority preview speed' },
      { ok:false, text:'Custom themes / palette / brand color' },
      { ok:false, text:'SEO fields & Analytics' },
    ]
  },
  {
    key: 'biz',
    name: 'Business',
    price: '$79.00',
    pill: 'per month',
    bullets: [
      { ok:true,  text:'Everything in Pro' },
      { ok:true,  text:'Themes, palette, custom brand color' },
      { ok:true,  text:'SEO title & description' },
      { ok:true,  text:'Google Analytics slot' },
      { ok:true,  text:'Best for growth & A/B iteration' },
    ]
  },
];

function renderPricing(selectedKey){
  const grid = document.getElementById('pricingGrid');
  grid.innerHTML = pricingData.map(tier => {
    const active = tier.key === selectedKey ? 'active' : '';
    const lis = tier.bullets.map(b => {
      const icon = b.ok ? '<span class="tier-ok">✔</span>' : '<span class="tier-no">✖</span>';
      return `<li>${icon}<span>${b.text}</span></li>`;
    }).join('');
    return `
      <div class="tier ${active}" data-key="${tier.key}">
        <div class="tier-head">
          <div class="tier-name">${tier.name} <span class="tier-pill">${tier.pill}</span></div>
          <div class="tier-price">${tier.price}</div>
        </div>
        <ul class="tier-list">${lis}</ul>
        <div class="tier-cta">
          <button type="button" data-action="choose">Choose ${tier.name}</button>
          <button type="button" class="ghost" data-action="close">Close</button>
        </div>
      </div>`;
  }).join('');
}

function openPricingModal(){
  const selected = currentPlan(); // 'basic' | 'pro' | 'biz'
  renderPricing(selected);
  document.getElementById('pricingBackdrop').classList.add('show');
  const modal = document.getElementById('pricingModal');
  modal.setAttribute('aria-hidden','false');
  // delegate clicks
  document.getElementById('pricingGrid').onclick = (e)=>{
    const tierEl = e.target.closest('.tier');
    if(!tierEl) return;
    const key = tierEl.getAttribute('data-key');
    if(e.target.matches('[data-action="choose"]')){
      // set the radio to match chosen tier
      const valueForRadio = key === 'biz' ? 'business' : key;
      const radio = document.querySelector(`input[name="plan"][value="${valueForRadio}"]`);
      if (radio) radio.checked = true;
      // re-apply locks and close
      applyPlanLocks?.();
      closePricingModal();
    }else if(e.target.matches('[data-action="close"]')){
      closePricingModal();
    }
  };
}
function closePricingModal(){
  document.getElementById('pricingBackdrop').classList.remove('show');
  document.getElementById('pricingModal').setAttribute('aria-hidden','true');
}
document.getElementById('openPricing')?.addEventListener('click', openPricingModal);
document.getElementById('pricingClose')?.addEventListener('click', closePricingModal);
document.getElementById('pricingBackdrop')?.addEventListener('click', closePricingModal);
// Optional: automatically open when switching radios:
document.addEventListener('change', (e)=>{
  if (e.target.matches('input[name="plan"]')) openPricingModal();
});
