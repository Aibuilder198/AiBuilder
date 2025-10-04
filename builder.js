// builder.js
// Frontend logic: plans, preview, AI logo, theme, checkout, download

// === Stripe ===
const stripe = Stripe("pk_test_1234567890"); // TODO: replace with your publishable key

// === Stripe Price IDs ===
const PLAN_PRICES = {
  basic_one_time: "price_20dollarOneTimeID",               // TODO: replace with your real $20 one-time
  pro_monthly:    "price_1SDbHKAmJkffDNdtYP9sVw1T",        // $29/mo
  biz_monthly:    "price_1SDbI1AmJkffDNdtjiqSI7qF"         // $79/mo
};

// === Elements ===
const planInputs   = document.querySelectorAll('input[name="plan"]');
const buyBtn       = document.getElementById("buyBtn");
const previewBtn   = document.getElementById("previewBtn");
const previewBtn2  = document.getElementById("previewBtn2");
const downloadBtn  = document.getElementById("downloadBtn");
const downloadBtn2 = document.getElementById("downloadBtn2");
const previewEl    = document.getElementById("preview");

// Branding & theme
const themeSel     = document.getElementById("theme");
const paletteSel   = document.getElementById("palette");
const brandColor   = document.getElementById("brandColor");
const bgType       = document.getElementById("bgType");
const bgUploadRow  = document.getElementById("bgUploadRow");
const bgImageFile  = document.getElementById("bgImage");

// Logo + AI logo
const logoFile     = document.getElementById("logoFile");
const logoPreview  = document.getElementById("logoPreview");
const genLogoBtn   = document.getElementById("genLogoBtn");
const logoGallery  = document.getElementById("logoGallery");
const aiBrand      = document.getElementById("aiBrand");
const aiSlogan     = document.getElementById("aiSlogan");
const aiIndustry   = document.getElementById("aiIndustry");
const aiStyle      = document.getElementById("aiStyle");
const aiColors     = document.getElementById("aiColors");

// Panels gated by plan
const brandingPanel = document.getElementById("brandingPanel");
const seoPanel      = document.getElementById("seoPanel");

let selectedPlan = "basic_one_time";
let uploadedBgDataUrl = "";
let uploadedLogoDataUrl = "";

// === Plan gating ===
function applyPlanGating() {
  const isPro  = selectedPlan === "pro_monthly" || selectedPlan === "biz_monthly";
  const isBiz  = selectedPlan === "biz_monthly";

  // Branding & Theme mostly for Business (we still let Basic set logo)
  themeSel.disabled    = !isBiz;
  paletteSel.disabled  = !isBiz;
  brandColor.disabled  = !isBiz;
  bgType.disabled      = !isBiz;
  bgImageFile.disabled = !isBiz;

  brandingPanel.style.opacity = isBiz ? 1 : 0.6;

  // AI Logo unlocked on Pro/Business
  genLogoBtn.disabled = !isPro;
  aiBrand.disabled    = !isPro;
  aiSlogan.disabled   = !isPro;
  aiIndustry.disabled = !isPro;
  aiStyle.disabled    = !isPro;
  aiColors.disabled   = !isPro;

  // SEO/Analytics only Business
  seoPanel.style.opacity = isBiz ? 1 : 0.5;
  [...seoPanel.querySelectorAll("input,textarea,button")].forEach(el => {
    if (el.id === "downloadBtn2" || el.id === "previewBtn2") return;
    el.disabled = !isBiz;
  });
}
planInputs.forEach(r => r.addEventListener("change", () => {
  selectedPlan = r.value;
  applyPlanGating();
}));
applyPlanGating();

// === Background control ===
bgType?.addEventListener("change", () => {
  bgUploadRow.style.display = bgType.value === "image" ? "" : "none";
});
bgImageFile?.addEventListener("change", async (e) => {
  const f = e.target.files?.[0]; if (!f) return;
  uploadedBgDataUrl = await fileToDataURL(f);
});

// === Logo upload ===
logoFile?.addEventListener("change", async (e) => {
  const f = e.target.files?.[0]; if (!f) return;
  uploadedLogoDataUrl = await fileToDataURL(f);
  logoPreview.src = uploadedLogoDataUrl;
});

// === AI Logo Maker ===
genLogoBtn?.addEventListener("click", async (e) => {
  e.preventDefault();
  if (genLogoBtn.disabled) {
    alert("AI Logo Maker is available on Pro and Business plans.");
    return;
  }
  genLogoBtn.textContent = "Generating…"; genLogoBtn.disabled = true;
  logoGallery.innerHTML = "";

  try {
    const payload = {
      brand: aiBrand.value.trim(),
      slogan: aiSlogan.value.trim(),
      industry: aiIndustry.value.trim(),
      style: aiStyle.value.trim(),
      colors: aiColors.value.trim()
    };
    const res = await fetch("/.netlify/functions/ai-logo", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Logo generation failed");

    // Expect array of data URLs (PNG or SVG data URLs)
    (data.images || []).forEach(src => {
      const img = new Image();
      img.src = src; img.style.width="72px"; img.style.height="72px";
      img.style.borderRadius="12px"; img.style.border="1px solid #243148"; img.style.cursor="pointer";
      img.addEventListener("click", () => {
        uploadedLogoDataUrl = src;
        logoPreview.src = src;
      });
      logoGallery.appendChild(img);
    });

    if (!data.images?.length) {
      logoGallery.innerHTML = `<span class="muted">No logos generated. Try different prompts/colors.</span>`;
    }
  } catch (err) {
    alert(err.message);
  } finally {
    genLogoBtn.textContent = "Generate Logos"; genLogoBtn.disabled = false;
  }
});

// === Preview ===
function collectSiteData() {
  return {
    name:  (document.getElementById("businessName").value || "My Business").trim(),
    desc:  (document.getElementById("businessDesc").value || "Business description here.").trim(),
    services: (document.getElementById("services").value || "").split("\n").map(s=>s.trim()).filter(Boolean),
    testimonials: (document.getElementById("testimonials").value || "").split("\n").map(s=>s.trim()).filter(Boolean),
    // branding/theme
    theme: themeSel?.value || "classic",
    palette: paletteSel?.value || "blue",
    brandColor: brandColor?.value || "#2563eb",
    bgType: bgType?.value || "gradient",
    bgDataUrl: uploadedBgDataUrl,
    logoDataUrl: uploadedLogoDataUrl,
    // seo
    seoTitle: (document.getElementById("seoTitle")?.value || "").trim(),
    seoDesc:  (document.getElementById("seoDesc")?.value || "").trim(),
    gaId:     (document.getElementById("gaId")?.value || "").trim(),
    canonUrl: (document.getElementById("canonUrl")?.value || "").trim(),
    gscToken: (document.getElementById("gscToken")?.value || "").trim()
  };
}

function renderPreview() {
  const d = collectSiteData();

  // background style
  let bgStyle = "";
  if (d.bgType === "image" && d.bgDataUrl) {
    bgStyle = `background:#000 url('${d.bgDataUrl}') center/cover no-repeat;`;
  } else {
    bgStyle = `background:linear-gradient(180deg,#0b1220,#111827);`;
  }

  // color theme hint
  const accent = d.brandColor || "#2563eb";
  const servicesHTML = d.services.length ? `<h4>Services</h4><ul>${d.services.map(s=>`<li>${s}</li>`).join("")}</ul>` : "";
  const testiHTML = d.testimonials.length ? `<h4>Testimonials</h4>${d.testimonials.map(t=>{
    const [name, quote] = t.split("|").map(x=>x?.trim());
    if (!name || !quote) return "";
    return `<blockquote style="margin:8px 0;border-left:3px solid ${accent};padding-left:10px">“${quote}” — <strong>${name}</strong></blockquote>`;
  }).join("")}` : "";

  const logoTag = d.logoDataUrl ? `<img src="${d.logoDataUrl}" alt="logo" style="width:56px;height:56px;border-radius:12px;border:1px solid #243148;background:#0a1220;object-fit:contain">` : "";

  previewEl.innerHTML = `
    <div class="card" style="${bgStyle}">
      <div class="brand-row" style="margin-bottom:14px">
        ${logoTag}
        <div>
          <h2 style="margin:0 0 4px">${d.name}</h2>
          <span class="muted">${d.theme} · ${d.palette}</span>
        </div>
      </div>
      <p>${d.desc}</p>
      ${servicesHTML}
      ${testiHTML}
      ${d.seoTitle ? `<p class="muted"><strong>SEO Title:</strong> ${d.seoTitle}</p>` : ""}
      ${d.seoDesc ? `<p class="muted"><strong>SEO Description:</strong> ${d.seoDesc}</p>` : ""}
    </div>
  `;
}

function fileToDataURL(file) {
  return new Promise((resolve,reject)=>{
    const r = new FileReader();
    r.onload = ()=>resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

// === Checkout ===
async function startCheckout() {
  try {
    buyBtn.disabled = true; buyBtn.textContent = "Opening checkout…";

    const res = await fetch("/.netlify/functions/create-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        priceId: PLAN_PRICES[selectedPlan],
        meta: JSON.stringify({
          name: document.getElementById("businessName").value || "",
          plan: selectedPlan
        })
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data || "Failed to create session");

    await stripe.redirectToCheckout({ sessionId: data.id });
  } catch (e) {
    alert("Failed to start checkout. Check your Netlify function and Stripe price IDs.\n\n" + e.message);
  } finally {
    buyBtn.disabled = false; buyBtn.textContent = "Buy & Unlock";
  }
}

// === Verify & Download ===
async function verifyPaid() {
  const res = await fetch("/.netlify/functions/verify-session");
  const data = await res.json();
  return !!data.verified;
}

async function downloadSite() {
  if (!(await verifyPaid())) {
    alert("Please complete payment to unlock downloads.");
    return;
  }

  const d = collectSiteData();
  // Minimal export – quick single-file HTML (you can expand to full multi-file ZIP later)
  const html = `<!doctype html><html><head>
<meta charset="utf-8">
<title>${d.seoTitle || d.name || "Website"}</title>
<meta name="description" content="${escapeHtml(d.seoDesc)}">
${d.gaId ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${d.gaId}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)};gtag('js',new Date());gtag('config','${d.gaId}');</script>`:""}
${d.gscToken ? `<meta name="google-site-verification" content="${escapeHtml(d.gscToken)}">`:""}
${d.canonUrl ? `<link rel="canonical" href="${escapeHtml(d.canonUrl)}">`:""}
<style>
body{font-family:Inter,system-ui,Segoe UI,Roboto,Arial,sans-serif;margin:0;padding:24px;background:#0b1220;color:#e5e7eb}
.card{background:#111827cc;border:1px solid #243148;border-radius:16px;padding:16px}
.brand-row{display:flex;gap:12px;align-items:center;margin-bottom:12px}
.brand-row img{width:56px;height:56px;border-radius:12px;object-fit:contain;background:#0a1220;border:1px solid #243148}
blockquote{margin:8px 0;border-left:3px solid ${d.brandColor};padding-left:10px}
</style>
</head><body>
<div class="card" style="${d.bgType==='image'&&d.bgDataUrl?`background:#000 url('${d.bgDataUrl}') center/cover no-repeat;`:`background:linear-gradient(180deg,#0b1220,#111827);`}">
  <div class="brand-row">
    ${d.logoDataUrl?`<img src="${d.logoDataUrl}" alt="logo">`:""}
    <div>
      <h1 style="margin:0">${escapeHtml(d.name)}</h1>
      <small>${escapeHtml(d.theme)} · ${escapeHtml(d.palette)}</small>
    </div>
  </div>
  <p>${escapeHtml(d.desc)}</p>
  ${d.services.length?`<h3>Services</h3><ul>${d.services.map(s=>`<li>${escapeHtml(s)}</li>`).join("")}</ul>`:""}
  ${d.testimonials.length?`<h3>Testimonials</h3>${d.testimonials.map(t=>{const [n,q]=(t||"").split("|").map(x=>x?.trim());return n&&q?`<blockquote>“${escapeHtml(q)}” — <strong>${escapeHtml(n)}</strong></blockquote>`:""}).join("")}`:""}
</div>
</body></html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "website.html"; document.body.appendChild(a); a.click(); a.remove();
}

function escapeHtml(s=""){return s.replace(/[&<>"']/g,m=>({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]))}

// === Events ===
planInputs.forEach(r => r.addEventListener("change", e => { selectedPlan = e.target.value; applyPlanGating(); }));
previewBtn?.addEventListener("click", (e)=>{ e.preventDefault(); renderPreview(); });
previewBtn2?.addEventListener("click",(e)=>{ e.preventDefault(); renderPreview(); });
buyBtn?.addEventListener("click",(e)=>{ e.preventDefault(); startCheckout(); });
downloadBtn?.addEventListener("click",(e)=>{ e.preventDefault(); downloadSite(); });
downloadBtn2?.addEventListener("click",(e)=>{ e.preventDefault(); downloadSite(); });

// Initial preview
renderPreview();
console.log("builder.js ready");
