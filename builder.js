/* =========================================================================
   Website Builder – Full File (with Stripe, AI Logo fallback, and gating)
   -------------------------------------------------------------------------
   EXPECTED HTML IDS (update these if your page uses different ids):
   - Plan radios:           #plan-basic, #plan-pro, #plan-business
   - Buttons:               #buyUnlockBtn, #previewBtn, #downloadZipBtn
   - Live preview pane:     #previewPane
   - Content inputs:        #businessName, #businessDescription
                            #services (textarea, one per line)
                            #testimonials (textarea, "Name | Quote" per line)
                            #phone, #email, #instagram
   - SEO & Analytics:       #seoTitle, #seoDescription, #gaId, #canonicalUrl,
                            #allowIndex (checkbox), #gscToken
   - Logo upload:           #logoUpload (file input), #selectedLogoData (hidden)
   - AI Logo Maker:         #generateLogosBtn, #logoBrand, #logoSlogan,
                            #logoIndustry, #logoStyle, #logoColors, #logoGallery
   - Branding/Theme (optional): #themeSelect, #brandColor
   -------------------------------------------------------------------------
   Back-end Functions required:
   - /.netlify/functions/create-checkout { plan: "basic"|"pro"|"business" }
     => { url }
   - /.netlify/functions/verify-session?session_id=... 
     => { ok: true } when payment confirmed
   - /.netlify/functions/ai-logo (POST) => { images: ["data:image/png;base64,..."] }
   ========================================================================= */

document.addEventListener("DOMContentLoaded", () => {
  // -----------------------------
  // 1) CONFIG – PUT YOUR PRICE IDs
  // -----------------------------
  const STRIPE_PRICE = {
    basic:    "price_20_ONETIME_REPLACE_ME",     // one-time $20
    pro:      "price_1SDbHKAmJkffDNdtYP9sVw1T",  // $29/mo  (you provided)
    business: "price_1SDbI1AmJkffDNdtjiqSI7qF",  // $79/mo  (you provided)
  };

  // ------------------------------
  // 2) ELEMENT LOOKUPS (update IDs)
  // ------------------------------
  const els = {
    planBasic:      byId("plan-basic"),
    planPro:        byId("plan-pro"),
    planBusiness:   byId("plan-business"),

    buyBtn:         byId("buyUnlockBtn"),
    previewBtn:     byId("previewBtn"),
    downloadBtn:    byId("downloadZipBtn"),

    previewPane:    byId("previewPane"),

    businessName:   byId("businessName"),
    businessDesc:   byId("businessDescription"),
    services:       byId("services"),
    testimonials:   byId("testimonials"),
    phone:          byId("phone"),
    email:          byId("email"),
    instagram:      byId("instagram"),

    seoTitle:       byId("seoTitle"),
    seoDesc:        byId("seoDescription"),
    gaId:           byId("gaId"),
    canonicalUrl:   byId("canonicalUrl"),
    allowIndex:     byId("allowIndex"),
    gscToken:       byId("gscToken"),

    themeSelect:    byId("themeSelect"),
    brandColor:     byId("brandColor"),

    logoUpload:     byId("logoUpload"),
    selectedLogo:   byId("selectedLogoData"), // hidden input for selected AI logo data-URL

    // AI logo maker
    logoBrand:      byId("logoBrand"),
    logoSlogan:     byId("logoSlogan"),
    logoIndustry:   byId("logoIndustry"),
    logoStyle:      byId("logoStyle"),
    logoColors:     byId("logoColors"),
    logoGallery:    byId("logoGallery"),
    generateLogosBtn: byId("generateLogosBtn"),
  };

  // -------------------------
  // 3) HELPERS
  // -------------------------
  function byId(id) { return document.getElementById(id); }

  function selectedPlan() {
    if (els.planBusiness?.checked) return "business";
    if (els.planPro?.checked)      return "pro";
    return "basic";
  }

  function lockButton(btn, label = "Working…") {
    if (!btn) return () => {};
    const prev = { disabled: btn.disabled, text: btn.textContent, width: btn.offsetWidth };
    btn.disabled = true;
    btn.style.minWidth = prev.width + "px";
    btn.textContent = label;
    return () => {
      btn.disabled = prev.disabled;
      btn.textContent = prev.text;
      btn.style.minWidth = "";
    };
  }

  function toast(message) {
    const el = document.createElement("div");
    el.textContent = message;
    el.style.cssText =
      "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#0b1220;color:#e2e8f0;padding:10px 14px;border:1px solid #334155;border-radius:10px;z-index:9999;box-shadow:0 8px 30px rgba(0,0,0,.4);max-width:90%;";
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  }

  async function postJSON(url, data) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data || {})
    });
    const isJson = res.headers.get("content-type")?.includes("application/json");
    const body = isJson ? await res.json() : null;
    return { ok: res.ok, status: res.status, body };
  }

  async function getJSON(url) {
    const res = await fetch(url, { headers: { "Accept": "application/json" }});
    const isJson = res.headers.get("content-type")?.includes("application/json");
    const body = isJson ? await res.json() : null;
    return { ok: res.ok, status: res.status, body };
  }

  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = reject;
      fr.readAsDataURL(file);
    });
  }

  // ---------------------------------
  // 4) COLLECT FORM / BUILDER CONTENT
  // ---------------------------------
  async function collectSiteData() {
    // Services
    const services = (els.services?.value || "")
      .split("\n")
      .map(s => s.trim())
      .filter(Boolean);

    // Testimonials in "Name | Quote" lines
    const testimonials = (els.testimonials?.value || "")
      .split("\n")
      .map(line => {
        const [name, quote] = line.split("|").map(s => s?.trim() || "");
        return (name || quote) ? { name, quote } : null;
      })
      .filter(Boolean);

    // Logo – Priority: selected AI logo -> uploaded file -> none
    let logoDataUrl = els.selectedLogo?.value || "";
    if (!logoDataUrl && els.logoUpload?.files?.[0]) {
      logoDataUrl = await readFileAsDataURL(els.logoUpload.files[0]);
    }

    const data = {
      plan: selectedPlan(),
      business: {
        name: els.businessName?.value || "",
        description: els.businessDesc?.value || "",
        phone: els.phone?.value || "",
        email: els.email?.value || "",
        instagram: els.instagram?.value || "",
        logo: logoDataUrl,
      },
      content: {
        services,
        testimonials
      },
      theme: {
        theme: els.themeSelect?.value || "classic",
        brandColor: els.brandColor?.value || "#0ea5e9",
      },
      seo: {
        title: els.seoTitle?.value || "",
        description: els.seoDesc?.value || "",
        gaId: els.gaId?.value || "",
        canonicalUrl: els.canonicalUrl?.value || "",
        allowIndex: !!els.allowIndex?.checked,
        gscToken: els.gscToken?.value || "",
      }
    };

    // store for success page verification/download
    localStorage.setItem("sitePreview", JSON.stringify(data));
    return data;
  }

  // ---------------------------------------
  // 5) RENDER LIVE PREVIEW (simple template)
  // ---------------------------------------
  function renderPreview(data) {
    if (!els.previewPane) return;

    const { business, content, theme, seo } = data;

    const logoImg = business.logo
      ? `<img src="${business.logo}" alt="Logo" style="width:48px;height:48px;object-fit:contain;border-radius:8px;background:#0b1220" />`
      : "";

    const servicesHtml = content.services.map(s => `<li>${escapeHtml(s)}</li>`).join("");
    const testimonialsHtml = content.testimonials.map(t => `
      <div class="card">
        <div class="card-title">${escapeHtml(t.name || "Customer")}</div>
        <div>${escapeHtml(t.quote || "")}</div>
      </div>
    `).join("");

    const contactBtnText = "Contact Us";

    // minimal styles inline for preview (you likely have CSS already)
    els.previewPane.innerHTML = `
      <div class="site" style="--brand:${theme.brandColor}">
        <header class="site-header" style="display:flex;gap:12px;align-items:center;">
          ${logoImg}
          <h1 style="margin:0">${escapeHtml(business.name || "Your Business")}</h1>
        </header>

        <section class="card">
          <div class="card-title">About Us</div>
          <p>${escapeHtml(business.description || "Write a short description here.")}</p>
          <a class="btn" href="${business.phone ? "tel:" + business.phone : "#"}">${contactBtnText}</a>
        </section>

        ${content.services.length ? `
          <section class="card">
            <div class="card-title">Services</div>
            <ul>${servicesHtml}</ul>
          </section>` : ""}

        ${content.testimonials.length ? `
          <section class="card">
            <div class="card-title">Testimonials</div>
            ${testimonialsHtml}
          </section>` : ""}

        <footer style="margin-top:24px;font-size:14px;color:#94a3b8">
          ${escapeHtml(seo.title || business.name || "Business")} — © ${new Date().getFullYear()}
        </footer>
      </div>
    `;

    // Quick theme CSS injected for preview readability
    injectPreviewStyles();
  }

  function injectPreviewStyles() {
    if (document.getElementById("builder-preview-styles")) return;
    const css = `
      #previewPane { color:#e2e8f0; }
      #previewPane .site { padding:16px; background:linear-gradient(180deg,#0b1220 0%,#0f172a 100%); border-radius:12px; }
      #previewPane .card { background:#0f172a; border:1px solid #334155; border-radius:12px; padding:14px; margin:14px 0; }
      #previewPane .card-title { font-weight:700; margin-bottom:8px; }
      #previewPane .btn { background:var(--brand,#0ea5e9); padding:10px 14px; border-radius:10px; color:white; text-decoration:none; display:inline-block; margin-top:8px; }
      #previewPane ul { margin:0; padding-left:20px; }
    `;
    const style = document.createElement("style");
    style.id = "builder-preview-styles";
    style.textContent = css;
    document.head.appendChild(style);
  }

  function escapeHtml(str) {
    return (str || "")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;");
  }

  // -----------------------------------
  // 6) BUTTON WIRES (Preview / Buy / DL)
  // -----------------------------------
  els.previewBtn?.addEventListener("click", async () => {
    const restore = lockButton(els.previewBtn, "Generating…");
    try {
      const data = await collectSiteData();
      renderPreview(data);
      toast("Preview updated.");
    } catch (e) {
      console.error(e);
      toast("Could not build preview.");
    } finally {
      restore();
    }
  });

  els.buyBtn?.addEventListener("click", async () => {
    const plan = selectedPlan();
    const restore = lockButton(els.buyBtn, "Redirecting…");
    try {
      const priceId = STRIPE_PRICE[plan];
      if (!priceId) {
        toast("Price ID missing for selected plan.");
        return;
      }
      // store the latest preview so success page can download after verify
      await collectSiteData();

      const { ok, body } = await postJSON("/.netlify/functions/create-checkout", {
        plan,
        priceId
      });

      if (ok && body?.url) {
        window.location.href = body.url; // to Stripe Checkout
      } else {
        toast(body?.error || "Failed to start checkout. Check your function and price IDs.");
      }
    } catch (e) {
      console.error(e);
      toast("Checkout is unavailable right now.");
    } finally {
      restore();
    }
  });

  els.downloadBtn?.addEventListener("click", async () => {
    const restore = lockButton(els.downloadBtn, "Verifying…");
    try {
      // Must have a paid session verified
      const url = new URL(window.location.href);
      const sessionId = url.searchParams.get("session_id");
      if (!sessionId) {
        toast("Download unlocks after payment. Please complete checkout first.");
        return;
      }
      const v = await getJSON(`/.netlify/functions/verify-session?session_id=${encodeURIComponent(sessionId)}`);
      if (!v.ok || !v.body?.ok) {
        toast("Payment not verified yet. Please refresh in a moment.");
        return;
      }

      // Get what we saved pre-checkout OR current form state
      const cached = localStorage.getItem("sitePreview");
      const data = cached ? JSON.parse(cached) : await collectSiteData();

      // Create a simple single-page HTML to download (no external libs)
      const html = buildExportHtml(data);
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${(data.business.name || "site").toLowerCase().replace(/\s+/g,"-")}.html`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
      toast("Download started.");
    } catch (e) {
      console.error(e);
      toast("Could not download site.");
    } finally {
      restore();
    }
  });

  // -----------------------------------
  // 7) AI Logo Maker with graceful fallback
  // -----------------------------------
  (function setupAiLogoMakerFallback() {
    const btn = els.generateLogosBtn;
    if (!btn) return;

    btn.addEventListener("click", async () => {
      const restore = lockButton(btn, "Generating…");
      try {
        const payload = {
          brand: (els.logoBrand?.value || "").trim(),
          slogan: (els.logoSlogan?.value || "").trim(),
          industry: (els.logoIndustry?.value || "").trim(),
          style: (els.logoStyle?.value || "").trim(),
          colors: (els.logoColors?.value || "").trim(),
        };

        const res = await fetch("/.netlify/functions/ai-logo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const isJson = res.headers.get("content-type")?.includes("application/json");
        const data = isJson ? await res.json() : {};

        if (!res.ok) {
          const msg = (data && data.error) || `${res.status} ${res.statusText}`;
          if (res.status === 400 && /billing|limit|hard limit|credit/i.test(msg)) {
            toast("AI logo is temporarily unavailable. Please upload your logo below.");
            nudgeUpload(els.logoUpload);
            return;
          }
          toast(`AI logo error: ${msg}. You can upload a logo instead.`);
          nudgeUpload(els.logoUpload);
          return;
        }

        if (Array.isArray(data.images) && data.images.length) {
          renderLogoChoices(data.images);
        } else {
          toast("No logos were returned. Please try again or upload a logo.");
          nudgeUpload(els.logoUpload);
        }
      } catch (err) {
        console.error("AI logo error:", err);
        toast("AI logo unavailable. Please upload your logo below.");
        nudgeUpload(els.logoUpload);
      } finally {
        restore();
      }
    });

    function renderLogoChoices(urls) {
      const g = els.logoGallery;
      if (!g) return;
      g.innerHTML = "";
      urls.forEach((src, i) => {
        const card = document.createElement("div");
        card.style.cssText = "display:inline-flex;flex-direction:column;align-items:center;margin:8px;padding:10px;background:#0f172a;border:1px solid #334155;border-radius:10px;";

        const img = new Image();
        img.src = src;
        img.alt = `AI logo ${i+1}`;
        img.style.cssText = "width:160px;height:160px;object-fit:contain;background:#0b1220;border-radius:8px;";

        const pick = document.createElement("button");
        pick.type = "button";
        pick.textContent = "Use this";
        pick.style.cssText = "margin-top:8px;padding:8px 10px;border-radius:8px;background:#0ea5e9;color:white;border:none;cursor:pointer;";
        pick.addEventListener("click", () => {
          if (els.selectedLogo) els.selectedLogo.value = src;
          toast("Logo selected! It will be included in your preview & download.");
        });

        card.append(img, pick);
        g.appendChild(card);
      });
    }

    function nudgeUpload(fileInput) {
      if (!fileInput) return;
      fileInput.style.outline = "2px solid #22d3ee";
      fileInput.style.outlineOffset = "2px";
      fileInput.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => {
        fileInput.style.outline = "";
        fileInput.style.outlineOffset = "";
      }, 1800);
    }
  })();

  // -----------------------------------
  // 8) EXPORTER – build a single HTML file
  // -----------------------------------
  function buildExportHtml(data) {
    const { business, content, theme, seo } = data;

    const logo = business.logo
      ? `<img src="${business.logo}" alt="Logo" style="width:56px;height:56px;object-fit:contain;border-radius:8px;background:#0b1220" />`
      : "";

    const services = content.services.map(s => `<li>${escapeHtml(s)}</li>`).join("");
    const testimonials = content.testimonials.map(t => `
      <div class="card">
        <div class="card-title">${escapeHtml(t.name || "Customer")}</div>
        <div>${escapeHtml(t.quote || "")}</div>
      </div>
    `).join("");

    // SEO & Analytics
    const robots = seo.allowIndex ? "index, follow" : "noindex, nofollow";
    const canonical = seo.canonicalUrl ? `<link rel="canonical" href="${seo.canonicalUrl}">` : "";
    const gtag = seo.gaId ? `
      <script async src="https://www.googletagmanager.com/gtag/js?id=${seo.gaId}"></script>
      <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${seo.gaId}');
      </script>` : "";

    const gsc = seo.gscToken ? `<meta name="google-site-verification" content="${escapeHtml(seo.gscToken)}">` : "";

    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(seo.title || business.name || "My Site")}</title>
<meta name="description" content="${escapeHtml(seo.description || "")}">
<meta name="robots" content="${robots}">
${canonical}
${gsc}
<style>
  :root { --brand: ${theme.brandColor || "#0ea5e9"}; }
  body { margin:0; font-family: system-ui, -apple-system, Segoe UI, Roboto, Inter, "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji"; background:#0b1220; color:#e2e8f0; }
  .wrap { max-width: 1200px; margin: 0 auto; padding: 22px; }
  header { display:flex; gap:12px; align-items:center; }
  h1 { margin: 0; }
  .card { background:#0f172a; border:1px solid #334155; border-radius:12px; padding:16px; margin:16px 0; }
  .card-title { font-weight:700; margin-bottom:8px; }
  .btn { background:var(--brand); padding:10px 14px; border-radius:10px; color:white; text-decoration:none; display:inline-block; margin-top:8px; }
  ul { margin:0; padding-left:20px; }
  footer { margin-top:24px; font-size:14px; color:#94a3b8; }
</style>
${gtag}
</head>
<body>
  <div class="wrap">
    <header>
      ${logo}
      <h1>${escapeHtml(business.name || "Your Business")}</h1>
    </header>

    <section class="card">
      <div class="card-title">About Us</div>
      <p>${escapeHtml(business.description || "")}</p>
      ${business.phone ? `<a class="btn" href="tel:${business.phone}">Call ${business.phone}</a>` : ""}
      ${business.email ? `<a class="btn" href="mailto:${business.email}">Email Us</a>` : ""}
      ${business.instagram ? `<a class="btn" href="${business.instagram}" target="_blank" rel="noopener">Instagram</a>` : ""}
    </section>

    ${content.services.length ? `
    <section class="card">
      <div class="card-title">Services</div>
      <ul>${services}</ul>
    </section>` : ""}

    ${content.testimonials.length ? `
    <section class="card">
      <div class="card-title">Testimonials</div>
      ${testimonials}
    </section>` : ""}

    <footer>${escapeHtml(seo.title || business.name || "Business")} — © ${new Date().getFullYear()}</footer>
  </div>
</body>
</html>`;
  }

  // Initial quick render (optional)
  try {
    const cached = localStorage.getItem("sitePreview");
    if (cached) renderPreview(JSON.parse(cached));
  } catch {}

}); // DOMContentLoaded end
