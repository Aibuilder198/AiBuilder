/* =========================================================
   builder.js
   - Collects form inputs
   - Uses uploaded logo or AI-logo fallback (localStorage.aiLogo)
   - Builds a single-page HTML site as a Blob
   - Renders a live preview (iframe)
   - Gated download: requires verify flag/session
========================================================= */

(function () {
  // ------------- tiny helpers -------------
  const $ = (id) => document.getElementById(id);
  const planRadios = () => [...document.querySelectorAll('input[name="plan"]')];

  async function fileToDataURL(file) {
    if (!file) return "";
    const buf = await file.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
    return `data:${file.type};base64,${base64}`;
  }
  async function filesToDataURLs(fileList, limit = 12) {
    const out = [];
    const len = Math.min(fileList?.length || 0, limit);
    for (let i = 0; i < len; i++) {
      out.push(await fileToDataURL(fileList[i]));
    }
    return out;
  }

  function pickBackgroundCSS(opts) {
    const type = opts.backgroundType || "gradient";
    const color = opts.brandColor || "#2563eb";
    if (type === "solid") {
      const c = /^#/.test(color) ? color : "#0b1221";
      return `background:${c};`;
    }
    if (type === "image" && opts.backgroundImageURL) {
      return `background:url('${opts.backgroundImageURL}') center/cover fixed no-repeat, #0b1221;`;
    }
    // default curated gradient
    return `
      background:
        radial-gradient(60% 120% at 100% 0%, #1a144a 0%, #0b1221 60%),
        radial-gradient(60% 120% at 0% 100%, #2b103d 0%, #0b1221 60%);
    `;
  }

  function isPaid() {
    // 1) If you added verify-session function, keep this:
    //    localStorage.setItem('stripePaid', 'ok') on success page after verification.
    if (localStorage.getItem("stripePaid") === "ok") return true;

    // 2) Fallback dev toggle for testing (set in console: localStorage.paidDev='ok')
    if (localStorage.getItem("paidDev") === "ok") return true;

    return false;
  }

  function updatePlanUI() {
    const selected = planRadios().find(r => r.checked)?.value || "basic";
    $("activePlanPill").textContent = selected.charAt(0).toUpperCase() + selected.slice(1);

    // lock/unlock fields depending on plan
    const proEnabled = selected !== "basic";
    const businessEnabled = selected === "business";

    $("proFields").style.opacity = proEnabled ? "1" : ".45";
    $("proFields").style.pointerEvents = proEnabled ? "auto" : "none";

    $("businessFields").style.opacity = businessEnabled ? "1" : ".45";
    $("businessFields").style.pointerEvents = businessEnabled ? "auto" : "none";
  }

  // ------------- collect input -------------
  async function collectSiteData() {
    const plan = planRadios().find(r => r.checked)?.value || "basic";

    // Logo: manual upload first, else AI-logo fallback
    let logoDataURL = "";
    if ($("logo")?.files?.[0]) {
      logoDataURL = await fileToDataURL($("logo").files[0]);
    } else {
      logoDataURL = localStorage.getItem("aiLogo") || "";
    }

    // Background image if chosen
    let backgroundImageURL = "";
    if ($("backgroundType").value === "image" && $("backgroundImage")?.files?.[0]) {
      backgroundImageURL = await fileToDataURL($("backgroundImage").files[0]);
    }

    // Gallery images (limit based on plan)
    const galleryLimit = plan === "basic" ? 6 : 12;
    const gallery = await filesToDataURLs($("gallery")?.files, galleryLimit);

    // Pro fields
    const services = ($("services")?.value || "")
      .split("\n").map(s => s.trim()).filter(Boolean);
    const testimonialsRaw = ($("testimonials")?.value || "")
      .split("\n").map(s => s.trim()).filter(Boolean);
    const testimonials = testimonialsRaw.map(line => {
      const [name, quote] = line.split("|").map(s => (s || "").trim());
      return { name: name || "Happy Customer", quote: quote || "" };
    });
    const hours = $("hours")?.value || "";
    const contactFormEmail = $("contactForm")?.value || "";

    // Business fields
    const theme = $("theme")?.value || "classic";
    const brandColor = $("brandColor")?.value || "#2563eb";
    const backgroundType = $("backgroundType")?.value || "gradient";

    const seo = {
      title: $("seoTitle")?.value || "",
      desc: $("seoDesc")?.value || "",
      gaId: $("gaId")?.value || "",
      canonical: $("canonicalUrl")?.value || "",
      allowIndexing: $("allowIndexing")?.checked ?? true,
      gscToken: $("gscToken")?.value || ""
    };

    return {
      plan,
      businessName: $("businessName").value.trim(),
      description: $("description").value.trim(),
      email: $("email").value.trim(),
      phone: $("phone").value.trim(),
      instagram: $("instagram").value.trim(),
      ctaText: $("ctaText").value.trim() || "Contact Us",
      logoDataURL,
      gallery,
      services,
      testimonials,
      hours,
      contactFormEmail,
      theme,
      brandColor,
      backgroundType,
      backgroundImageURL,
      seo
    };
  }

  // ------------- site HTML builder -------------
  function buildSiteHTML(d) {
    const bgCSS = pickBackgroundCSS(d);
    const brand = d.brandColor || "#2563eb";
    const canIndex = !!d?.seo?.allowIndexing;

    const gaScript = d.seo.gaId
      ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${d.seo.gaId}"></script>
         <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)};gtag('js',new Date());gtag('config','${d.seo.gaId}');</script>`
      : "";

    const robotsMeta = canIndex ? "" : `<meta name="robots" content="noindex,nofollow">`;
    const canonicalLink = d.seo.canonical ? `<link rel="canonical" href="${d.seo.canonical}">` : "";
    const gscMeta = d.seo.gscToken ? `<meta name="google-site-verification" content="${d.seo.gscToken}">` : "";

    const logoImg = d.logoDataURL
      ? `<img src="${d.logoDataURL}" alt="Logo" style="height:56px;width:auto;border-radius:8px;background:#fff;padding:3px" />`
      : "";

    const galleryHTML = d.gallery?.length
      ? d.gallery.map(src => `<img src="${src}" alt="" style="width:100%;border-radius:12px;background:#0f172a" />`).join("")
      : "";

    const servicesHTML = (d.plan !== "basic" && d.services?.length)
      ? `<section class="panel"><h2>Services</h2><ul>${d.services.map(s => `<li>${escapeHTML(s)}</li>`).join("")}</ul></section>`
      : "";

    const testimonialsHTML = (d.plan !== "basic" && d.testimonials?.length)
      ? `<section class="panel"><h2>Testimonials</h2>
           ${d.testimonials.map(t => `
             <blockquote class="quote">
               <div class="q">${escapeHTML(t.quote || "Amazing!")}</div>
               <div class="by">— ${escapeHTML(t.name || "Customer")}</div>
             </blockquote>
           `).join("")}
         </section>`
      : "";

    const hoursHTML = (d.plan !== "basic" && d.hours)
      ? `<section class="panel"><h2>Hours / Location</h2><pre class="pre">${escapeHTML(d.hours)}</pre></section>`
      : "";

    const contactFormHTML = (d.plan === "business" && d.contactFormEmail)
      ? `<section class="panel"><h2>Contact Form</h2>
           <form class="contact" onsubmit="alert('This is a demo form. Connect to your email service.');return false;">
             <input required placeholder="Your name" />
             <input required type="email" placeholder="Your email" />
             <textarea placeholder="How can we help?"></textarea>
             <button type="submit" class="btn">Send</button>
           </form>
         </section>`
      : "";

    const themeCSS = themeStyles(d.theme, brand);

    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escapeHTML(d.seo.title || d.businessName || "My Site")}</title>
<meta name="description" content="${escapeHTML(d.seo.desc || d.description || "")}" />
${robotsMeta}
${canonicalLink}
${gscMeta}
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
  :root{
    --brand: ${brand};
    --panel: rgba(255,255,255,0.06);
    --border: rgba(255,255,255,0.16);
    --text: #e5e7eb;
    --muted:#a1a1aa;
    --radius: 14px;
  }
  *{box-sizing:border-box}
  body{margin:0;font-family:Inter,system-ui,Segoe UI,Roboto,Arial,sans-serif;color:var(--text);${bgCSS}}
  .wrap{max-width:1000px;margin:24px auto;padding:0 16px}
  header{display:flex;gap:14px;align-items:center;margin-bottom:16px}
  h1{font-weight:800;margin:0}
  .brand{display:flex;gap:12px;align-items:center}
  .panel{
    background:var(--panel);
    border:1px solid var(--border);
    border-radius:var(--radius);
    padding:16px;
    margin:12px 0;
    backdrop-filter: blur(6px);
  }
  .hero{display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap}
  .cta{background:var(--brand);color:#fff;border:0;border-radius:12px;padding:12px 16px;font-weight:800;cursor:pointer}
  .gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px}
  ul{padding-left:18px}
  .quote{background:rgba(255,255,255,.06);border:1px solid var(--border);padding:12px;border-radius:12px;margin:10px 0}
  .quote .q{font-weight:700}
  .quote .by{color:#cbd5e1;margin-top:6px}
  .pre{white-space:pre-wrap}
  .contact{display:grid;gap:8px}
  .contact input,.contact textarea{background:rgba(255,255,255,.06);border:1px solid var(--border);color:#fff;border-radius:10px;padding:10px}
  .btn{background:var(--brand);color:#fff;border:0;border-radius:10px;padding:10px 14px;font-weight:800;cursor:pointer}
  .footer{color:#cbd5e1;text-align:center;margin:28px 0}
  ${themeCSS}
</style>
${gaScript}
</head>
<body>
  <div class="wrap">
    <header class="brand">
      ${logoImg}
      <div>
        <h1>${escapeHTML(d.businessName || "Your Business")}</h1>
        <div style="color:#cbd5e1">${escapeHTML(d.description || "")}</div>
      </div>
    </header>

    <section class="panel hero">
      <button class="cta" onclick="location.href='mailto:${encodeHTML(d.email)}'">${escapeHTML(d.ctaText)}</button>
      ${d.phone ? `<a class="cta" style="background:#334155" href="tel:${encodeURIComponent(d.phone)}">Call ${escapeHTML(d.phone)}</a>` : ""}
      ${d.instagram ? `<a class="cta" style="background:#1f2937" href="${escapeAttr(d.instagram)}" target="_blank">Instagram</a>` : ""}
    </section>

    ${servicesHTML}

    ${d.gallery?.length ? `<section class="panel"><h2>Gallery</h2><div class="gallery">${galleryHTML}</div></section>` : ""}

    ${testimonialsHTML}

    ${hoursHTML}

    ${contactFormHTML}

    <div class="footer">© ${new Date().getFullYear()} ${escapeHTML(d.businessName || "Your Business")}. All rights reserved.</div>
  </div>
</body>
</html>`;
  }

  function themeStyles(theme, brand) {
    if (theme === "dark") {
      return `.panel{background:rgba(0,0,0,.35)}`;
    }
    if (theme === "clean") {
      return `.panel{background:rgba(255,255,255,.9);color:#0f172a}
              body{color:#0f172a}
              .quote{background:#f1f5f9;border-color:#e2e8f0}
              .contact input,.contact textarea{background:#fff;border-color:#e2e8f0;color:#0f172a}
              .cta{background:${brand};color:#fff}`;
    }
    return ``; // classic
  }

  // ------------- preview + download -------------
  async function generatePreview() {
    const data = await collectSiteData();
    const html = buildSiteHTML(data);
    const blob = new Blob([html], { type: "text/html" });
    $("previewFrame").src = URL.createObjectURL(blob);
  }

  async function downloadZipGate() {
    if (!isPaid()) {
      alert("Please complete payment first. After Stripe success, return to the Success page so we can verify and unlock download.");
      return;
    }
    // create a simple zip with 1 file (index.html) – use JSZip
    // To keep it dependency-free, we'll download a single HTML file named site.html.
    const data = await collectSiteData();
    const html = buildSiteHTML(data);
    const blob = new Blob([html], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = (data.businessName?.replace(/\W+/g,'-').toLowerCase() || "website") + ".html";
    a.click();
  }

  // ------------- gating UI -------------
  function refreshGate() {
    const paid = isPaid();
    const btn = $("downloadBtn");
    const help = $("gateHelp");
    if (paid) {
      btn.classList.remove("locked");
      btn.title = "Download your site";
      help.textContent = "Payment verified. You can download your website.";
    } else {
      btn.classList.add("locked");
      btn.title = "Complete payment to unlock";
      help.textContent = "Download unlocks after payment (success page verification).";
    }
  }

  // ------------- event wiring -------------
  function wire() {
    $("previewBtn").addEventListener("click", generatePreview);
    $("downloadBtn").addEventListener("click", downloadZipGate);

    planRadios().forEach(r => r.addEventListener("change", () => {
      updatePlanUI();
    }));

    $("backgroundType").addEventListener("change", () => {
      $("bgUploadCol").style.display = $("backgroundType").value === "image" ? "block" : "none";
    });

    // Modal-like plan details (lightweight tip)
    $("viewPlan").addEventListener("click", () => {
      alert(
`Plan details:

• Basic ($20 one-time)
  - Single page + logo
  - Few gallery images

• Pro ($29/mo)
  - Adds Services, Testimonials
  - Hours/Location, Contact email

• Business ($79/mo)
  - Themes, brand color, custom background
  - SEO & Analytics fields
  - (Download still requires payment verification)`
      );
    });

    updatePlanUI();
    refreshGate();
  }

  // ------------- utils -------------
  function escapeHTML(s) { return (s || "").replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch])); }
  function encodeHTML(s) { return encodeURIComponent(s || ""); }
  function escapeAttr(s) { return (s || "").replace(/"/g, "&quot;"); }

  // init
  document.addEventListener("DOMContentLoaded", wire);
})();
