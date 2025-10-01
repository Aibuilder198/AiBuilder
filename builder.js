// ---------------- helpers ----------------
const byId = (id) => document.getElementById(id);
const LSK = "aiwb_draft_v2";

// read a File -> data URL (base64)
const fileToDataURL = (file) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });

// Load meta.json (safe defaults if missing)
async function loadMeta() {
  try {
    const res = await fetch("/meta.json", { cache: "no-store" });
    if (!res.ok) throw new Error("meta.json missing");
    return await res.json();
  } catch {
    return {
      siteName: "AI Website Builder",
      features: { builderForm: true, checkout: true },
      stripe: { priceId: "price_1SDFSNAmJkffDNdt0pAhcn8Y", currency: "usd", amount: 2000 },
      messages: {
        success: "Payment Successful! Your AI-generated website will be emailed shortly.",
        cancel: "Payment Canceled. Please try again."
      }
    };
  }
}

// parse helpers
const lines = (t) => (t || "").split(/\r?\n/).map(s => s.trim()).filter(Boolean);
const parseServices = (t) => lines(t);
const parseTestimonials = (t) =>
  lines(t).map(row => {
    const [name, quote] = row.split("|").map(s => (s || "").trim());
    return name && quote ? { name, quote } : null;
  }).filter(Boolean);

// Google Fonts link builder (optional)
function googleFontLink(font) {
  const map = {
    "Inter": "Inter:wght@400;600;700",
    "Poppins": "Poppins:wght@400;600;700",
    "Playfair Display": "Playfair+Display:wght@400;600;700"
  };
  const fam = map[font];
  return fam ? `https://fonts.googleapis.com/css2?family=${fam}&display=swap` : "";
}

// theme variables
function themeVars(theme, brand) {
  const base = { bg:"#f8fafc", ink:"#0f172a", card:"#ffffff", brand, muted:"#475569" };
  switch (theme) {
    case "dark":   return { bg:"#0b1220", ink:"#e2e8f0", card:"#0f172a", brand, muted:"#94a3b8" };
    case "ocean":  return { bg:"#eef6ff", ink:"#0f172a", card:"#ffffff", brand:"#0284c7", muted:"#475569" };
    case "sunset": return { bg:"#fff5f0", ink:"#1f2937", card:"#ffffff", brand:"#f97316", muted:"#6b7280" };
    case "forest": return { bg:"#f2f8f4", ink:"#0b3a2a", card:"#ffffff", brand:"#059669", muted:"#47605a" };
    default:       return base;
  }
}

// ---------------- HTML generator ----------------
function buildSiteHTML({
  businessName, description, brandColor, theme, font,
  logoDataURL, galleryDataURLs,
  ctaText, email, phone, instagram,
  servicesText, testimonialsText, hoursText, address
}) {
  const services = parseServices(servicesText);
  const testimonials = parseTestimonials(testimonialsText);
  const hours = lines(hoursText);

  const vars = themeVars(theme, brandColor || "#0ea5e9");
  const gf = googleFontLink(font);
  const fontStack = font === "system-ui"
    ? "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif"
    : `'${font}', system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif`;

  const galleryHTML = (galleryDataURLs || []).length
    ? `<section class="card">
        <h2>Gallery</h2>
        <div class="grid">
          ${galleryDataURLs.map(src => `<figure class="thumb"><img src="${src}" alt="Gallery image"></figure>`).join("")}
        </div>
      </section>`
    : "";

  const servicesHTML = services.length
    ? `<section class="card">
        <h2>Services</h2>
        <ul class="list">${services.map(s => `<li>${s}</li>`).join("")}</ul>
      </section>`
    : "";

  const testimonialsHTML = testimonials.length
    ? `<section class="card">
        <h2>Testimonials</h2>
        <div class="testis">
          ${testimonials.map(t => `<blockquote>
              <p>“${t.quote}”</p>
              <footer>— ${t.name}</footer>
            </blockquote>`).join("")}
        </div>
      </section>`
    : "";

  const hoursHTML = hours.length || address
    ? `<section class="card">
        <h2>Hours & Location</h2>
        ${hours.length ? `<ul class="list">${hours.map(h => `<li>${h}</li>`).join("")}</ul>` : ""}
        ${address ? `<p class="address">${address}</p>` : ""}
      </section>` : "";

  const contactBits = [
    email ? `<a class="contact" href="mailto:${email}">Email: ${email}</a>` : "",
    phone ? `<div class="contact">Phone: ${phone}</div>` : "",
    instagram ? `<a class="contact" href="${instagram}" target="_blank" rel="noopener">Instagram</a>` : ""
  ].filter(Boolean).join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${businessName}</title>
${gf ? `<link href="${gf}" rel="stylesheet">` : ""}
<style>
  :root { --bg:${vars.bg}; --ink:${vars.ink}; --card:${vars.card}; --brand:${vars.brand}; --muted:${vars.muted}; }
  * { box-sizing: border-box; }
  body { font-family:${fontStack}; margin:0; color:var(--ink); background:var(--bg); }
  header { background:var(--brand); color:#fff; padding:26px 20px; display:flex; align-items:center; gap:14px; }
  header img.logo { height:44px; width:auto; border-radius:8px; background:#fff; padding:4px; }
  header h1 { margin:0; font-size:28px; line-height:1.2; }
  main { max-width:1000px; margin:28px auto; padding:0 16px; }
  .card { background:var(--card); border-radius:14px; box-shadow:0 6px 20px rgba(15,23,42,.08); padding:22px; margin-bottom:22px; }
  .cta { display:inline-block; margin-top:14px; background:var(--brand); color:#fff; padding:10px 16px; border-radius:10px; text-decoration:none; }
  .muted { color:var(--muted); }
  .grid { display:grid; grid-template-columns: repeat(auto-fill,minmax(180px,1fr)); gap:12px; margin-top:10px; }
  .thumb { border-radius:12px; overflow:hidden; background:#fff; box-shadow:0 2px 12px rgba(15,23,42,.06); }
  .thumb img { width:100%; height:160px; object-fit:cover; display:block; }
  .list { padding-left:18px; }
  .testis { display:grid; gap:12px; }
  blockquote { margin:0; padding:14px; background:#ffffff10; border-left:4px solid var(--brand); border-radius:10px; }
  blockquote p { margin:0 0 6px; }
  blockquote footer { font-size:14px; color:var(--muted); }
  .contact { display:inline-block; margin-right:12px; color:var(--brand); text-decoration:none; }
  .address { margin-top:8px; }
  footer { text-align:center; color:var(--muted); padding:24px 12px; }
</style>
</head>
<body>
  <header>
    ${logoDataURL ? `<img class="logo" src="${logoDataURL}" alt="Logo">` : ""}
    <h1>${businessName}</h1>
  </header>

  <main>
    <section class="card">
      <h2>About Us</h2>
      <p>${description}</p>
      <a class="cta" href="mailto:${email || "hello@example.com"}">${ctaText || "Contact Us"}</a>
    </section>

    ${servicesHTML}
    ${testimonialsHTML}
    ${galleryHTML}
    ${hoursHTML}

    <section class="card">
      <h2>Contact</h2>
      ${contactBits || "<p class='muted'>Reach out to us any time.</p>"}
    </section>
  </main>

  <footer class="muted">© ${new Date().getFullYear()} ${businessName}. All rights reserved.</footer>
</body>
</html>`;
}

// collect form → (HTML string) including images as data URLs
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

  // images
  let logoDataURL = "";
  const logoInput = byId("logo");
  if (logoInput?.files?.[0]) {
    logoDataURL = await fileToDataURL(logoInput.files[0]);
  }
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

  return buildSiteHTML({
    businessName, description, brandColor, theme, font,
    logoDataURL, galleryDataURLs,
    ctaText, email, phone, instagram,
    servicesText, testimonialsText, hoursText, address
  });
}

// save/load drafts (text options only; images are not persisted)
function saveDraftIfWanted() {
  const remember = byId("remember")?.checked;
  if (!remember) { localStorage.removeItem(LSK); return; }
  const draft = {
    businessName: byId("businessName")?.value || "",
    description:  byId("description")?.value || "",
    brandColor:   byId("brandColor")?.value || "#0ea5e9",
    theme:        byId("theme")?.value || "light",
    font:         byId("font")?.value || "system-ui",
    ctaText:      byId("ctaText")?.value || "Contact Us",
    email:        byId("email")?.value || "",
    phone:        byId("phone")?.value || "",
    instagram:    byId("instagram")?.value || "",
    services:     byId("services")?.value || "",
    testimonials: byId("testimonials")?.value || "",
    hours:        byId("hours")?.value || "",
    address:      byId("address")?.value || "",
    remember: true
  };
  localStorage.setItem(LSK, JSON.stringify(draft));
}

function loadDraft() {
  try {
    const raw = localStorage.getItem(LSK);
    if (!raw) return;
    const d = JSON.parse(raw);
    const set = (id, v) => { if (byId(id) && v != null) byId(id).value = v; };
    set("businessName", d.businessName);
    set("description",  d.description);
    set("brandColor",   d.brandColor);
    set("theme",        d.theme);
    set("font",         d.font);
    set("ctaText",      d.ctaText);
    set("email",        d.email);
    set("phone",        d.phone);
    set("instagram",    d.instagram);
    set("services",     d.services);
    set("testimonials", d.testimonials);
    set("hours",        d.hours);
    set("address",      d.address);
    if (byId("remember")) byId("remember").checked = !!d.remember;
  } catch {}
}

// ---------------- main ----------------
document.addEventListener("DOMContentLoaded", async () => {
  const meta = await loadMeta();
  console.log("Loaded meta:", meta);

  loadDraft();

  let lastGeneratedHtml = "";

  // Generate Website → preview + download + save draft
  const form = byId("builderForm");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      saveDraftIfWanted();

      lastGeneratedHtml = await collectFormAsHTML();

      let preview = byId("preview");
      if (!preview) {
        preview = document.createElement("div");
        preview.id = "preview";
        preview.style.marginTop = "20px";
        form.parentElement.appendChild(preview);
      }
      preview.innerHTML = "";

      const iframe = document.createElement("iframe");
      iframe.style.width = "100%";
      iframe.style.height = "700px";
      iframe.style.border = "1px solid #e2e8f0";
      iframe.title = "Generated site preview";
      preview.appendChild(iframe);

      const doc = iframe.contentDocument || iframe.contentWindow.document;
      doc.open(); doc.write(lastGeneratedHtml); doc.close();

      const businessName = (byId("businessName")?.value || "site").trim();
      let dl = byId("downloadSite");
      if (!dl) {
        dl = document.createElement("a");
        dl.id = "downloadSite";
        dl.textContent = "Download Your Site";
        dl.style.display = "inline-block";
        dl.style.marginTop = "12px";
        dl.style.background = "#0ea5e9";
        dl.style.color = "white";
        dl.style.padding = "10px 14px";
        dl.style.borderRadius = "10px";
        dl.style.textDecoration = "none";
        preview.appendChild(dl);
      }
      const blob = new Blob([lastGeneratedHtml], { type: "text/html;charset=utf-8" });
      dl.href = URL.createObjectURL(blob);
      dl.download = `${businessName.replace(/\s+/g, "-").toLowerCase()}-site.html`;
    });
  }

  // Stripe Checkout
  const checkoutBtn = byId("checkoutBtn");
  if (meta.features?.checkout && checkoutBtn) {
    checkoutBtn.addEventListener("click", async () => {
      checkoutBtn.disabled = true;
      try {
        if (!lastGeneratedHtml) {
          lastGeneratedHtml = await collectFormAsHTML();
        }
        saveDraftIfWanted();

        const businessName = (byId("businessName")?.value || "").trim();
        const description  = (byId("description")?.value || "").trim();

        const res = await fetch("/.netlify/functions/create-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: [{ price: meta.stripe?.priceId || "price_1SDFSNAmJkffDNdt0pAhcn8Y", quantity: 1 }],
            success_url: `${window.location.origin}/success`,
            cancel_url: `${window.location.origin}/cancel`,
            sitePayload: {
              businessName,
              description,
              htmlBase64: btoa(unescape(encodeURIComponent(lastGeneratedHtml)))
            }
          })
        });

        if (!res.ok) {
          const text = await res.text();
          console.error("Checkout failed:", text);
          alert(`Checkout failed: ${text}`);
          return;
        }
        const data = await res.json();
        if (data?.url) window.location.href = data.url;
      } catch (err) {
        console.error("Checkout error:", err);
        alert("There was a problem starting checkout. See console for details.");
      } finally {
        checkoutBtn.disabled = false;
      }
    });
  } else if (checkoutBtn) {
    checkoutBtn.style.display = "none";
  }
});
