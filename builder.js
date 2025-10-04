// ===== builder.js =====

/* ---------- Helpers ---------- */
const $ = (id) => document.getElementById(id);
const val = (id) => ($(id)?.value || "").trim();
const fileToDataURL = (file) =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });

/* ---------- Plans & Gating ---------- */
function currentPlan() {
  const checked = document.querySelector('input[name="plan"]:checked');
  return (checked?.value || "basic").toLowerCase();
}

function toggleDisabled(ids, enabled) {
  ids.forEach((id) => {
    const el = $(id);
    if (!el) return;
    el.disabled = !enabled;
    el.classList.toggle("disabled", !enabled);
  });
}

function applyPlanLocks() {
  const plan = currentPlan();
  const isPro = plan === "pro" || plan === "business";
  const isBiz = plan === "business";

  // Pro unlocks:
  toggleDisabled(
    ["services", "testimonials", "hours", "address", "formspree"],
    isPro
  );

  // Business unlocks:
  toggleDisabled(
    [
      "template",
      "palette",
      "brandColor",
      "seoTitle",
      "seoDescription",
      "gaId",
      "allowIndexing",
      "siteUrl",
      "gscToken",
    ],
    isBiz
  );
}

/* ---------- Background UI toggle ---------- */
function show(el, on) {
  if (!el) return;
  el.classList[on ? "remove" : "add"]("hide");
}
function updateBgUI() {
  const v = $("bgType")?.value || "default";
  show($("bgUploadRow"), v === "image-upload");
  show($("bgUrlRow"), v === "image-url");
  show($("bgGradientRow"), v === "gradient");
  show($("bgSolidRow"), v === "solid");
}

/* ---------- Theme / Palette ---------- */
function paletteToColors(palette, brandColorInput) {
  const map = {
    blue: { brand: "#2563eb", bg1: "#0ea5e9", bg2: "#2563eb" },
    emerald: { brand: "#10b981", bg1: "#34d399", bg2: "#10b981" },
    rose: { brand: "#f43f5e", bg1: "#fb7185", bg2: "#f43f5e" },
    slate: { brand: "#64748b", bg1: "#94a3b8", bg2: "#64748b" },
  };
  const base = map[palette] || map.blue;
  const brand =
    (brandColorInput && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(brandColorInput))
      ? brandColorInput
      : base.brand;
  return { brand, bg1: base.bg1, bg2: base.bg2 };
}

/* ---------- SEO / Head tags ---------- */
function buildJsonLd(site) {
  const openingHours = (site.hours || [])
    .map((s) => s.trim())
    .filter(Boolean);

  const sameAs = [];
  if (site.instagram) sameAs.push(site.instagram);

  const obj = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: site.businessName,
    description: site.description,
    url: site.siteUrl || undefined,
    telephone: site.phone || undefined,
    sameAs: sameAs.length ? sameAs : undefined,
    openingHours: openingHours.length ? openingHours : undefined,
  };
  if (site.address) {
    obj.address = { "@type": "PostalAddress", streetAddress: site.address };
  }
  return obj;
}

function escapeHtml(s = "") {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildHeadTags(site) {
  const isBiz = site.plan === "business";
  const allowIndex = isBiz && site.allowIndexing;
  const robots = allowIndex ? "index,follow" : "noindex,nofollow";

  const title = isBiz && site.seoTitle ? site.seoTitle : site.businessName;
  const desc =
    isBiz && site.seoDescription ? site.seoDescription : site.description || "";

  const canonical =
    isBiz && site.siteUrl
      ? `<link rel="canonical" href="${escapeHtml(site.siteUrl)}">`
      : "";

  const gsc =
    isBiz && site.gscToken
      ? `<meta name="google-site-verification" content="${escapeHtml(
          site.gscToken
        )}">`
      : "";

  const og = `
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(desc)}">
${site.siteUrl ? `<meta property="og:url" content="${escapeHtml(site.siteUrl)}">` : ""}
<meta property="og:type" content="website">`;

  const tw = `
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(desc)}">`;

  const jsonLd = JSON.stringify(buildJsonLd(site));

  const ga = isBiz && site.gaId
    ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${escapeHtml(
        site.gaId
      )}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date()); gtag('config', '${escapeHtml(site.gaId)}');
</script>`
    : "";

  return `
<meta name="robots" content="${robots}">
${gsc}
${canonical}
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(desc)}">
${og}
${tw}
<script type="application/ld+json">${jsonLd}</script>
${ga}`;
}

/* ---------- Background CSS for generated site ---------- */
function backgroundCSS(bg, colors) {
  const overlay = Math.max(0, Math.min(0.9, bg.overlay || 0.55));
  if (bg.type === "image-upload" || bg.type === "image-url") {
    const img =
      bg.image ||
      "https://images.unsplash.com/photo-1520975922326-0f1f1a6f63e0?q=80&w=1920&auto=format&fit=crop";
    return `
body{
  margin:0;color:#111827;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
  background:
    linear-gradient(180deg, rgba(0,0,0,${overlay}), rgba(0,0,0,${overlay})),
    url("${img}") center/cover fixed no-repeat;
}`;
  }
  if (bg.type === "gradient") {
    return `
body{
  margin:0;color:#111827;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
  background:
    radial-gradient(1200px 800px at 10% -10%, ${colors.bg1}, transparent 60%),
    radial-gradient(1000px 700px at 90% 110%, ${colors.bg2}, transparent 60%),
    #0b1221;
}`;
  }
  if (bg.type === "solid") {
    return `
body{
  margin:0;color:#111827;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
  background:${bg.solid || "#0b1221"};
}`;
  }
  // default
  return `
body{
  margin:0;color:#111827;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
  background:
    linear-gradient(180deg, rgba(8,13,25,.75), rgba(8,13,25,.85)),
    url("https://images.unsplash.com/photo-1520975922326-0f1f1a6f63e0?q=80&w=1920&auto=format&fit=crop") center/cover fixed no-repeat;
}`;
}

/* ---------- Build full page HTML ---------- */
function buildPageHTML(site) {
  const head = buildHeadTags(site);
  const cssBg = backgroundCSS(site.bg, site.colors);
  const brand = site.colors.brand;

  // Optional blocks
  const logoBlock = site.logoDataURL
    ? `<img class="logo" src="${site.logoDataURL}" alt="Logo">`
    : "";

  const galleryBlock =
    site.galleryDataURLs && site.galleryDataURLs.length
      ? `<section class="card">
  <h2>Gallery</h2>
  <div class="grid">
    ${site.galleryDataURLs
      .map((src) => `<figure class="thumb"><img src="${src}" alt=""></figure>`)
      .join("")}
  </div>
</section>`
      : "";

  const servicesList =
    site.services?.length
      ? `<section class="card">
  <h2>Services</h2>
  <ul class="list">${site.services.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ul>
</section>`
      : "";

  const testimonialsList =
    site.testimonials?.length
      ? `<section class="card">
  <h2>Testimonials</h2>
  <div class="testis">
    ${site.testimonials
      .map(
        (t) =>
          `<blockquote><p>“${escapeHtml(t.quote)}”</p><footer>— ${escapeHtml(
            t.name
          )}</footer></blockquote>`
      )
      .join("")}
  </div>
</section>`
      : "";

  const hoursLoc =
    site.hours?.length || site.address
      ? `<section class="card">
  <h2>Hours & Location</h2>
  ${site.hours?.length ? `<ul class="list">${site.hours.map((h)=>`<li>${escapeHtml(h)}</li>`).join("")}</ul>` : ""}
  ${site.address ? `<p class="address">${escapeHtml(site.address)}</p>` : ""}
  ${
    site.address
      ? `<div class="mapWrap"><iframe title="Map" width="100%" height="280" loading="lazy" style="border:0;border-radius:12px"
    src="https://www.google.com/maps?q=${encodeURIComponent(
      site.address
    )}&output=embed"></iframe></div>`
      : ""
  }
</section>`
      : "";

  const contactBits = [
    site.email
      ? `<a class="contact" href="mailto:${escapeHtml(site.email)}">Email: ${escapeHtml(
          site.email
        )}</a>`
      : "",
    site.phone ? `<span class="contact">Phone: ${escapeHtml(site.phone)}</span>` : "",
    site.instagram
      ? `<a class="contact" href="${escapeHtml(
          site.instagram
        )}" target="_blank" rel="noopener">Instagram</a>`
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  // Page CSS
  const css = `
:root{ --brand:${brand}; --ink:#0f172a }
*{ box-sizing:border-box } html,body{ height:100% }
${cssBg}
.veil{ min-height:100%; background:linear-gradient(180deg,rgba(0,0,0,.0),rgba(0,0,0,.22)); display:flex; flex-direction:column; }
header{ padding:22px 16px; display:flex; align-items:center; gap:12px; color:#fff; text-shadow:0 2px 10px rgba(0,0,0,.4) }
header .logo{ height:44px; background:#fff; padding:4px; border-radius:8px }
header h1{ margin:0; font-size:28px }
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
`;

  // HTML
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
${head}
<style>${css}</style>
</head>
<body>
<div class="veil">
<header>
  ${logoBlock}
  <h1>${escapeHtml(site.businessName)}</h1>
</header>
<main>
  <section class="card hero">
    <h2>About Us</h2>
    <p>${escapeHtml(site.description || "")}</p>
    <a class="cta" href="mailto:${escapeHtml(site.email || "hello@example.com")}">${escapeHtml(site.ctaText || "Contact Us")}</a>
  </section>

  ${servicesList}
  ${testimonialsList}
  ${galleryBlock}
  ${hoursLoc}

  <section class="card">
    <h2>Contact</h2>
    ${contactBits || "<p>Reach out any time.</p>"}
  </section>
</main>
<footer>© ${new Date().getFullYear()} ${escapeHtml(site.businessName)}. All rights reserved.</footer>
</div>
</body>
</html>`;
}

/* ---------- Robots & Sitemap ---------- */
function buildSitemap(site) {
  const base = (site.siteUrl || "https://example.com").replace(/\/+$/, "");
  const urls = [`${base}/`];
  const now = new Date().toISOString();
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urls
    .map(
      (u) =>
        `<url><loc>${u}</loc><lastmod>${now}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`
    )
    .join("\n  ")}
</urlset>`;
}

function buildRobots(site) {
  const allowIndex = site.plan === "business" && !!site.allowIndexing;
  const base = (site.siteUrl || "").replace(/\/+$/, "");
  const sitemapLine = base ? `Sitemap: ${base}/sitemap.xml` : "";
  return `${allowIndex ? "User-agent: *\nAllow: /" : "User-agent: *\nDisallow: /"}
${sitemapLine}`;
}

/* ---------- Collect Form → Site Object ---------- */
async function collectSiteData() {
  // Plan
  const plan = currentPlan();

  // Core
  const businessName = val("businessName");
  const description = val("businessDescription");
  const email = val("email");
  const phone = val("phone");
  const instagram = val("instagram");
  const ctaText = val("ctaText");

  // Logo
  let logoDataURL = "";
  const logoFile = $("logo")?.files?.[0];
  if (logoFile) logoDataURL = await fileToDataURL(logoFile);

  // Gallery (limit 8 for speed; skip huge files > ~1.8MB)
  const galleryDataURLs = [];
  const galleryFiles = $("gallery")?.files ? Array.from($("gallery").files) : [];
  for (const f of galleryFiles.slice(0, 8)) {
    if (f.size <= 1.8 * 1024 * 1024) {
      galleryDataURLs.push(await fileToDataURL(f));
    }
  }

  // Background
  const bgType = $("bgType")?.value || "default";
  let bgImage = "";
  if (bgType === "image-upload") {
    const f = $("bgUpload")?.files?.[0];
    if (f) bgImage = await fileToDataURL(f);
  } else if (bgType === "image-url") {
    bgImage = val("bgUrl");
  }
  const overlayPct = parseInt($("bgOverlay")?.value || "55", 10);
  const bg = {
    type: bgType,
    image: bgImage,
    color1: $("bgColor1")?.value || "#0ea5e9",
    color2: $("bgColor2")?.value || "#2563eb",
    solid: $("bgSolid")?.value || "#0b1221",
    overlay: isNaN(overlayPct) ? 0.55 : Math.max(0, Math.min(0.9, overlayPct / 100)),
  };

  // Palette / Brand
  const palette = $("palette")?.value || "blue";
  const brandColor = $("brandColor")?.value || "";
  const colors = paletteToColors(palette, brandColor);

  // Pro
  const isPro = plan === "pro" || plan === "business";
  const services = isPro ? splitLines(val("services")) : [];
  const testimonials = isPro ? splitTestimonials(val("testimonials")) : [];
  const hours = isPro ? splitLines(val("hours")) : [];
  const address = isPro ? val("address") : "";
  const formspree = isPro ? val("formspree") : "";

  // Business (SEO)
  const isBiz = plan === "business";
  const seoTitle = isBiz ? val("seoTitle") : "";
  const seoDescription = isBiz ? val("seoDescription") : "";
  const gaId = isBiz ? val("gaId") : "";
  const allowIndexing = isBiz ? !!$("allowIndexing")?.checked : false;
  const siteUrl = isBiz ? val("siteUrl") : "";
  const gscToken = isBiz ? val("gscToken") : "";
  const template = isBiz ? $("template")?.value || "classic" : "classic";

  return {
    plan,
    businessName,
    description,
    email,
    phone,
    instagram,
    ctaText,
    logoDataURL,
    galleryDataURLs,
    bg,
    colors,
    services,
    testimonials,
    hours,
    address,
    formspree,
    // business
    template,
    seoTitle,
    seoDescription,
    gaId,
    allowIndexing,
    siteUrl,
    gscToken,
  };
}

function splitLines(text) {
  return (text || "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}
function splitTestimonials(text) {
  return splitLines(text).map((row) => {
    const [name, quote] = row.split("|").map((s) => (s || "").trim());
    if (!name || !quote) return null;
    return { name, quote };
  }).filter(Boolean);
}

/* ---------- Preview + ZIP ---------- */
async function handleGenerate(e) {
  e.preventDefault();

  const site = await collectSiteData();

  // Build HTML
  const html = buildPageHTML(site);

  // Live preview
  const iframe = $("preview");
  if (iframe) iframe.srcdoc = html;

  // Build ZIP (index.html + robots.txt + sitemap.xml)
  if (window.JSZip) {
    const zip = new JSZip();
    zip.file("index.html", html);
    zip.file("robots.txt", buildRobots(site));
    zip.file("sitemap.xml", buildSitemap(site));

    const blob = await zip.generateAsync({ type: "blob" });
    const link = $("downloadLink");
    if (link) {
      link.href = URL.createObjectURL(blob);
      link.download = "website.zip";
      link.style.display = "inline-block";
    }
  } else {
    alert("JSZip not loaded — cannot prepare download.");
  }
}

/* ---------- Init ---------- */
document.addEventListener("DOMContentLoaded", () => {
  // Plan gating
  applyPlanLocks();
  document.getElementById("planForm")?.addEventListener("change", (e) => {
    if (e.target?.name === "plan") applyPlanLocks();
  });

  // Background UI
  updateBgUI();
  $("bgType")?.addEventListener("change", updateBgUI);

  // Form submit -> preview + zip
  $("siteForm")?.addEventListener("submit", handleGenerate);
});
