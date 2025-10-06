/* ====== PRICES (replace with your live Stripe price IDs) ====== */
const PRICE_BASIC_ONE_TIME = "price_1SDFSNAmJkffDNdt0pAhcn8Y"; // $20 one-time
const PRICE_PRO_MONTHLY    = "price_1SDbHKAmJkffDNdtYP9sVw1T"; // $29/mo
const PRICE_BIZ_MONTHLY    = "price_1SDbI1AmJkffDNdtjiqSI7qF"; // $79/mo

/* ====== ELEMENTS ====== */
const planInputs   = document.querySelectorAll('input[name="plan"]');
const buyBtn       = document.getElementById("buyBtn");
const previewBtn   = document.getElementById("previewBtn");
const downloadBtn  = document.getElementById("downloadBtn");
const sitePreview  = document.getElementById("sitePreview");

const bizName      = document.getElementById("bizName");
const bizDesc      = document.getElementById("bizDesc");
const services     = document.getElementById("services");
const testimonials = document.getElementById("testimonials");

const logoFile     = document.getElementById("logoFile");
const logoPreview  = document.getElementById("logoPreview");
const galleryFiles = document.getElementById("galleryFiles");

// SEO
const seoTitle     = document.getElementById("seoTitle");
const seoDesc      = document.getElementById("seoDesc");
const gaId         = document.getElementById("gaId");
const canonicalUrl = document.getElementById("canonicalUrl");
const allowIndex   = document.getElementById("allowIndex");

// AI logo
const aiPanel      = document.getElementById("aiLogoPanel");
const aiBrand      = document.getElementById("aiBrand");
const aiSlogan     = document.getElementById("aiSlogan");
const aiIndustry   = document.getElementById("aiIndustry");
const aiStyle      = document.getElementById("aiStyle");
const aiColors     = document.getElementById("aiColors");
const genLogoBtn   = document.getElementById("genLogoBtn");
const logoGallery  = document.getElementById("logoGallery");

/* ====== STATE & UTIL ====== */
let unlocked = false; // set to true after verified success page
const sleep = (ms) => new Promise(r=>setTimeout(r,ms));

function selectedPlan() {
  return [...planInputs].find(r => r.checked)?.value || "basic_one_time";
}

function applyPlanGating() {
  const plan = selectedPlan();
  const proOrBiz = (plan === "pro_monthly" || plan === "biz_monthly");
  if (aiPanel) {
    aiPanel.style.display = proOrBiz ? "" : "none";
    genLogoBtn.disabled = !proOrBiz;
  }
}
planInputs.forEach(r => r.addEventListener("change", applyPlanGating));
applyPlanGating();

/* ====== LOGO PREVIEW ====== */
logoFile?.addEventListener("change", (e) => {
  const f = e.target.files?.[0];
  if (!f) return;
  const url = URL.createObjectURL(f);
  logoPreview.src = url;
});

/* ====== PREVIEW GENERATION ====== */
function htmlEscape(s=""){ return s.replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])) }
function linesToList(lines="") {
  const items = lines.split("\n").map(s=>s.trim()).filter(Boolean);
  if (!items.length) return "";
  return `<ul>${items.map(li=>`<li>${htmlEscape(li)}</li>`).join("")}</ul>`;
}
function testimonialsToCards(text="") {
  const items = text.split("\n").map(s=>s.trim()).filter(Boolean);
  if (!items.length) return "";
  return `<div class="tcards">${items.map(row=>{
    const [name, quote] = row.split("|").map(s=>s?.trim()||"");
    return `<div class="tcard"><blockquote>${htmlEscape(quote)}</blockquote><div class="tname">— ${htmlEscape(name)}</div></div>`;
  }).join("")}</div>`;
}
async function filesToDataUrls(fileList, max=6) {
  if (!fileList) return [];
  const files = [...fileList].slice(0,max);
  const arr = [];
  for (const f of files) {
    arr.push(await fileToDataUrl(f));
  }
  return arr;
}
function fileToDataUrl(file) {
  return new Promise((resolve,reject)=>{
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}

async function buildSiteHtml() {
  const name = bizName.value || "My Business";
  const desc = bizDesc.value || "";

  const svcList  = linesToList(services.value);
  const testiDom = testimonialsToCards(testimonials.value);

  const logoSrc = logoPreview.src || "";

  const gallery = await filesToDataUrls(galleryFiles.files, 6);
  const galHtml = gallery.length
    ? `<div class="grid">${gallery.map(src=>`<img src="${src}" alt="">`).join("")}</div>`
    : "";

  const headSeo = `
    <title>${htmlEscape(seoTitle.value || name)}</title>
    <meta name="description" content="${htmlEscape(seoDesc.value || desc)}" />
    ${allowIndex.checked ? "" : '<meta name="robots" content="noindex,nofollow">'}
    ${canonicalUrl.value ? `<link rel="canonical" href="${htmlEscape(canonicalUrl.value)}">` : ""}
    ${gaId.value ? `
      <script async src="https://www.googletagmanager.com/gtag/js?id=${htmlEscape(gaId.value)}"></script>
      <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)};gtag('js',new Date());gtag('config','${htmlEscape(gaId.value)}');</script>
    ` : ""}
  `;

  const css = `
    body{font-family:system-ui,-apple-system,Segoe UI,Roboto; margin:0; color:#0c1220; background:#f8fafc;}
    header{display:flex; gap:12px; align-items:center; padding:22px; background:#0ea5e9; color:#fff;}
    header img{width:48px;height:48px;object-fit:contain;background:#ffffff22;border-radius:8px}
    main{max-width:900px;margin:20px auto;padding:0 16px}
    section.card{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:18px;margin:14px 0;box-shadow:0 5px 20px rgba(16,24,40,.06)}
    .grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
    .grid img{width:100%;height:160px;object-fit:cover;border-radius:12px;border:1px solid #e2e8f0}
    .tcard{border:1px solid #e2e8f0;border-radius:12px;padding:12px;background:#fff}
    .tname{font-weight:600;color:#0f172a;margin-top:6px}
    footer{padding:22px;color:#475569}
  `;

  return `
<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
${headSeo}
<style>${css}</style></head>
<body>
  <header>
    ${logoSrc ? `<img src="${logoSrc}" alt="logo">` : ""}
    <h1>${htmlEscape(name)}</h1>
  </header>
  <main>
    <section class="card">
      <h2>About Us</h2>
      <p>${htmlEscape(desc)}</p>
      ${svcList ? `<h3>Services</h3>${svcList}` : ""}
    </section>

    ${testiDom ? `<section class="card"><h2>Testimonials</h2>${testiDom}</section>` : ""}

    ${galHtml ? `<section class="card"><h2>Gallery</h2>${galHtml}</section>` : ""}
  </main>
  <footer>© ${new Date().getFullYear()} ${htmlEscape(name)}. All rights reserved.</footer>
</body></html>`;
}

async function updatePreview() {
  const html = await buildSiteHtml();
  const blob = new Blob([html], {type:"text/html"});
  const url  = URL.createObjectURL(blob);
  sitePreview.src = url;
}
previewBtn?.addEventListener("click", updatePreview);

/* ====== DOWNLOAD ZIP (locked until payment) ====== */
downloadBtn?.addEventListener("click", async () => {
  if (!unlocked) {
    alert("Download is locked. Complete payment first.");
    return;
  }
  const html = await buildSiteHtml();
  const zipBlob = new Blob([html], { type: "text/html" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(zipBlob);
  a.download = "site.html";
  a.click();
});

/* ====== BUY FLOW (Stripe Checkout via Netlify function) ====== */
buyBtn?.addEventListener("click", async () => {
  const plan = selectedPlan();
  const price =
    plan === "pro_monthly" ? PRICE_PRO_MONTHLY :
    plan === "biz_monthly" ? PRICE_BIZ_MONTHLY :
    PRICE_BASIC_ONE_TIME;

  try {
    buyBtn.disabled = true; buyBtn.textContent = "Opening checkout...";
    const res = await fetch("/.netlify/functions/create-checkout", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({
        items: [{ price, quantity: 1 }],
        success_url: `${window.location.origin}/success`,
        cancel_url: `${window.location.origin}/cancel`
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to start checkout");
    window.location.href = data.url;
  } catch (err) {
    alert(err.message);
  } finally {
    buyBtn.disabled = false; buyBtn.textContent = "Buy & Unlock";
  }
});

/* ====== SUCCESS PAGE VERIFICATION (optional) ======
   If you add /success page with session verification, set unlocked=true there.
   For now, leave manual. */

/* ====== AI LOGO MAKER ====== */
genLogoBtn?.addEventListener("click", async (e) => {
  e.preventDefault();
  const plan = selectedPlan();
  if (plan === "basic_one_time") {
    return alert("AI Logo Maker is available on Pro/Business plans.");
  }
  genLogoBtn.disabled = true; genLogoBtn.textContent = "Generating…";
  logoGallery.innerHTML = "";
  try {
    const res = await fetch("/.netlify/functions/ai-logo", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({
        brand: aiBrand.value || bizName.value || "Brand",
        slogan: aiSlogan.value || "",
        industry: aiIndustry.value || "",
        style: aiStyle.value || "Minimal",
        colors: aiColors.value || ""
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Logo generation failed");

    (data.images || []).forEach(src => {
      const img = new Image();
      img.src = src;
      img.style.width = "80px";
      img.style.height = "80px";
      img.style.border = "1px solid #22384f";
      img.style.borderRadius = "12px";
      img.style.cursor = "pointer";
      img.title = "Click to use this logo";
      img.onclick = () => logoPreview.src = src;
      logoGallery.appendChild(img);
    });
    if (!data.images?.length) {
      logoGallery.innerHTML = '<span class="muted">No logos returned. Try changing style or colors.</span>';
    }
  } catch (err) {
    alert(err.message);
  } finally {
    genLogoBtn.disabled = false; genLogoBtn.textContent = "Generate Logos";
  }
});
