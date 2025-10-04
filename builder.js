/* =========================================================
   builder.js – preview, checkout, download gate & logo maker
========================================================= */

(function () {
  // ----------------------- CONFIG -----------------------
  // Replace these with YOUR Stripe price IDs
  const PRICE_IDS = {
    basic_one_time: "REPLACE_WITH_20_ONETIME", // <- put your $20 one-time price id here
    pro_monthly:    "price_1SDbHKAmJkffDNdtYP9sVw1T", // $29/mo (you gave this)
    biz_monthly:    "price_1SDbI1AmJkffDNdtjiqSI7qF"  // $79/mo (you gave this)
  };

  // If you already added a success page that verifies the session
  // set localStorage.setItem('stripePaid', 'ok') there after verification.
  // For local testing you can run in console: localStorage.paidDev='ok'

  // ----------------------- helpers -----------------------
  const $ = (id) => document.getElementById(id);
  const planRadios = () => [...document.querySelectorAll('input[name="plan"]')];

  function escapeHTML(s){return (s||"").replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]))}
  function escapeAttr(s){return (s||"").replace(/"/g,"&quot;")}
  function encodeHTML(s){return encodeURIComponent(s||"")}

  async function fileToDataURL(file){
    if(!file) return "";
    const buf=await file.arrayBuffer();
    const b64=btoa(String.fromCharCode(...new Uint8Array(buf)));
    return `data:${file.type};base64,${b64}`;
  }
  async function filesToDataURLs(list, limit=12){
    const out=[];
    const len=Math.min(list?.length||0, limit);
    for(let i=0;i<len;i++){ out.push(await fileToDataURL(list[i])) }
    return out;
  }

  function pickBackgroundCSS(opts){
    const type=opts.backgroundType||"gradient";
    const color=opts.brandColor||"#2563eb";
    if(type==="solid"){
      const c=/^#/.test(color)?color:"#0b1221";
      return `background:${c};`;
    }
    if(type==="image" && opts.backgroundImageURL){
      return `background:url('${opts.backgroundImageURL}') center/cover fixed no-repeat, #0b1221;`;
    }
    return `
      background:
        radial-gradient(60% 120% at 100% 0%, #1a144a 0%, #0b1221 60%),
        radial-gradient(60% 120% at 0% 100%, #2b103d 0%, #0b1221 60%);
    `;
  }

  function themeStyles(theme, brand){
    if(theme==="dark"){ return `.panel{background:rgba(0,0,0,.35)}` }
    if(theme==="clean"){
      return `.panel{background:rgba(255,255,255,.9);color:#0f172a}
              body{color:#0f172a}
              .quote{background:#f1f5f9;border-color:#e2e8f0}
              .contact input,.contact textarea{background:#fff;border-color:#e2e8f0;color:#0f172a}
              .cta{background:${brand};color:#fff}`;
    }
    return ``;
  }

  function isPaid(){
    if(localStorage.getItem("stripePaid")==="ok") return true;
    if(localStorage.getItem("paidDev")==="ok") return true; // dev override
    return false;
  }

  function refreshGate(){
    const paid = isPaid();
    const btn = $("downloadBtn");
    const help = $("gateHelp");
    if(paid){
      btn.classList.remove("locked");
      btn.title = "Download your site";
      help.textContent = "Payment verified. You can download your website.";
    }else{
      btn.classList.add("locked");
      btn.title = "Complete payment to unlock";
      help.textContent = "Download unlocks after payment (success page verification).";
    }
  }

  function updatePlanUI(){
    const selected = planRadios().find(r=>r.checked)?.value || "basic";
    $("activePlanPill").textContent = selected.charAt(0).toUpperCase()+selected.slice(1);

    const proEnabled = selected!=="basic";
    const bizEnabled = selected==="business";

    $("proFields").style.opacity = proEnabled ? "1" : ".45";
    $("proFields").style.pointerEvents = proEnabled ? "auto" : "none";

    $("businessFields").style.opacity = bizEnabled ? "1" : ".45";
    $("businessFields").style.pointerEvents = bizEnabled ? "auto" : "none";
  }

  // ----------------------- data & HTML -----------------------
  async function collectSiteData(){
    const plan = planRadios().find(r=>r.checked)?.value || "basic";

    // logo: uploaded first, else AI svg fallback
    let logoDataURL = "";
    if($("logo")?.files?.[0]) {
      logoDataURL = await fileToDataURL($("logo").files[0]);
    } else if(localStorage.getItem("aiLogo")){
      logoDataURL = localStorage.getItem("aiLogo");
    }

    // background image if requested
    let backgroundImageURL="";
    if($("backgroundType").value==="image" && $("backgroundImage")?.files?.[0]){
      backgroundImageURL = await fileToDataURL($("backgroundImage").files[0]);
    }

    const galleryLimit = plan==="basic" ? 6 : 12;
    const gallery = await filesToDataURLs($("gallery")?.files, galleryLimit);

    const services = ($("services")?.value||"").split("\n").map(s=>s.trim()).filter(Boolean);
    const testimonialsRaw = ($("testimonials")?.value||"").split("\n").map(s=>s.trim()).filter(Boolean);
    const testimonials = testimonialsRaw.map(line=>{
      const [name,quote]=(line.split("|").map(s=>(s||"").trim()));
      return {name:name||"Happy Customer", quote:quote||""};
    });

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
      hours: $("hours")?.value || "",
      contactFormEmail: $("contactForm")?.value || "",
      theme: $("theme")?.value || "classic",
      brandColor: $("brandColor")?.value || "#2563eb",
      backgroundType: $("backgroundType")?.value || "gradient",
      backgroundImageURL,
      seo: {
        title: $("seoTitle")?.value || "",
        desc: $("seoDesc")?.value || "",
        gaId: $("gaId")?.value || "",
        canonical: $("canonicalUrl")?.value || "",
        allowIndexing: $("allowIndexing")?.checked ?? true,
        gscToken: $("gscToken")?.value || ""
      }
    };
  }

  function buildSiteHTML(d){
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

    const logoImg = d.logoDataURL ? `<img src="${d.logoDataURL}" alt="Logo" style="height:56px;width:auto;border-radius:8px;background:#fff;padding:3px" />` : "";

    const galleryHTML = d.gallery?.length
      ? d.gallery.map(src=>`<img src="${src}" alt="" style="width:100%;border-radius:12px;background:#0f172a" />`).join("")
      : "";

    const servicesHTML = (d.plan!=="basic" && d.services?.length)
      ? `<section class="panel"><h2>Services</h2><ul>${d.services.map(s=>`<li>${escapeHTML(s)}</li>`).join("")}</ul></section>` : "";

    const testimonialsHTML = (d.plan!=="basic" && d.testimonials?.length)
      ? `<section class="panel"><h2>Testimonials</h2>${d.testimonials.map(t=>`
          <blockquote class="quote">
            <div class="q">${escapeHTML(t.quote || "Amazing!")}</div>
            <div class="by">— ${escapeHTML(t.name || "Customer")}</div>
          </blockquote>`).join("")}
        </section>` : "";

    const hoursHTML = (d.plan!=="basic" && d.hours)
      ? `<section class="panel"><h2>Hours / Location</h2><pre class="pre">${escapeHTML(d.hours)}</pre></section>` : "";

    const contactFormHTML = (d.plan==="business" && d.contactFormEmail)
      ? `<section class="panel"><h2>Contact Form</h2>
           <form class="contact" onsubmit="alert('Demo form. Connect to your email service.');return false;">
             <input required placeholder="Your name" />
             <input required type="email" placeholder="Your email" />
             <textarea placeholder="How can we help?"></textarea>
             <button type="submit" class="btn">Send</button>
           </form>
         </section>` : "";

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
    --radius: 14px;
  }
  *{box-sizing:border-box}
  body{margin:0;font-family:Inter,system-ui,Segoe UI,Roboto,Arial,sans-serif;color:var(--text);${bgCSS}}
  .wrap{max-width:1000px;margin:24px auto;padding:0 16px}
  header{display:flex;gap:14px;align-items:center;margin-bottom:16px}
  h1{font-weight:800;margin:0}
  .panel{background:var(--panel);border:1px solid var(--border);border-radius:var(--radius);padding:16px;margin:12px 0;backdrop-filter: blur(6px)}
  .hero{display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap}
  .cta{background:var(--brand);color:#fff;border:0;border-radius:12px;padding:12px 16px;font-weight:800;cursor:pointer}
  .gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px}
  ul{padding-left:18px}
  .quote{background:rgba(255,255,255,.06);border:1px solid var(--border);padding:12px;border-radius:12px;margin:10px 0}
  .quote .q{font-weight:700}.quote .by{color:#cbd5e1;margin-top:6px}
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
      ${d.logoDataURL ? `${logoImg}` : ""}
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

    <div class="footer">© ${new Date().getFullYear()} ${escapeHTML(d.businessName || "Your Business")} • Built with your AI Website Builder</div>
  </div>
</body>
</html>`;
  }

  // ----------------------- preview & download -----------------------
  async function generatePreview(){
    const data = await collectSiteData();
    const html = buildSiteHTML(data);
    const blob = new Blob([html], {type:"text/html"});
    $("previewFrame").src = URL.createObjectURL(blob);
  }

  async function downloadGate(){
    if(!isPaid()){
      alert("Please complete payment first. After Stripe success, return to the success page so we can verify and unlock download.");
      return;
    }
    const data = await collectSiteData();
    const html = buildSiteHTML(data);
    const blob = new Blob([html], {type:"text/html"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = (data.businessName?.replace(/\W+/g,'-').toLowerCase() || "website") + ".html";
    a.click();
  }

  // ----------------------- checkout -----------------------
  function getSelectedPriceId(){
    const val = planRadios().find(r=>r.checked)?.value || "basic";
    if(val==="basic")    return PRICE_IDS.basic_one_time;
    if(val==="pro")      return PRICE_IDS.pro_monthly;
    return PRICE_IDS.biz_monthly; // business
  }

  function safeMetaString(obj){
    // keep metadata short (< 500 chars) to avoid Stripe errors
    try{
      const s = JSON.stringify(obj);
      return s.length > 450 ? s.slice(0,450) : s;
    }catch(_){ return "" }
  }

  async function startCheckout(){
    // Read current plan + a tiny bit of metadata (shortened)
    const data = await collectSiteData();
    const priceId = getSelectedPriceId();

    if(!priceId || priceId.startsWith("REPLACE_WITH_")){
      alert("Please set your real Stripe price ID(s) in builder.js first.");
      return;
    }

    const body = {
      priceId,
      // Short metadata
      meta: safeMetaString({
        plan: data.plan,
        business: (data.businessName||"").slice(0,60),
      }),
      // Optional success/cancel override if your function supports it
      // success_url: window.location.origin + "/success.html",
      // cancel_url: window.location.origin + "/"
    };

    try{
      $("buyBtn").disabled = true;
      $("buyHelp").textContent = "Opening checkout…";
      const res = await fetch("/.netlify/functions/create-checkout",{
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify(body)
      });
      if(!res.ok){
        const txt = await res.text();
        throw new Error(txt || "Checkout error");
      }
      const { url } = await res.json();
      if(!url) throw new Error("No checkout URL returned.");
      window.location.href = url;
    }catch(err){
      console.error(err);
      alert("Failed to start checkout. Check your Netlify function config and price IDs.");
      $("buyHelp").textContent = "You’ll be redirected to Stripe checkout.";
    }finally{
      $("buyBtn").disabled = false;
    }
  }

  // ----------------------- AI Logo Maker (local SVG) -----------------------
  // This generates 6 simple, clean SVG options locally (no API).
  function parseColors(str){
    if(!str) return [];
    return str.split(",").map(s=>s.trim()).filter(c=>/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(c));
  }

  function pick(arr, i){ return arr[i % arr.length] }

  function makeSVG(name, slogan, style, colors, variant){
    const palettes = colors.length >= 2 ? colors : ["#2563eb","#0ea5e9","#0b1221","#f8fafc"];
    const bg = "#ffffff";
    const accent = pick(palettes, variant);
    const accent2 = pick(palettes, variant+1);
    const fontWeight = style==="bold" ? 800 : style==="elegant" ? 600 : 700;
    const friendly = style==="friendly" ? "8" : "4";
    const symbol = variant % 2 === 0
      ? `<circle cx="50" cy="50" r="40" fill="${accent}" />
         <circle cx="70" cy="40" r="12" fill="${accent2}" opacity=".9" />`
      : `<rect x="10" y="10" width="80" height="80" rx="${friendly}" fill="${accent}"/>
         <rect x="28" y="28" width="44" height="44" rx="${friendly}" fill="${accent2}" opacity=".9"/>`;

    const textY = 62;
    const sloganY = 82;

    return `
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="200" viewBox="0 0 640 200">
  <defs>
    <filter id="s" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#000" flood-opacity=".2"/>
    </filter>
  </defs>
  <rect width="640" height="200" fill="${bg}"/>
  <g transform="translate(24,24)" filter="url(#s)">
    ${symbol}
  </g>
  <g transform="translate(140,32)">
    <text x="0" y="${textY}" font-size="42" font-family="Inter,system-ui" font-weight="${fontWeight}" fill="#111827">${escapeHTML(name||"Your Brand")}</text>
    ${slogan ? `<text x="0" y="${sloganY}" font-size="18" font-family="Inter,system-ui" fill="#374151">${escapeHTML(slogan)}</text>` : ""}
  </g>
</svg>`;
  }

  function svgToDataUrl(svg){ return "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svg))) }

  function generateLogos(){
    const name = $("logoName").value.trim() || $("businessName").value.trim() || "Your Brand";
    const slogan = $("logoSlogan").value.trim();
    const style = $("logoStyle").value;
    const colors = parseColors($("logoCustomColors").value);

    const root = $("logoResults");
    root.innerHTML = "";
    for(let i=0;i<6;i++){
      const svg = makeSVG(name, slogan, style, colors, i);
      const url = svgToDataUrl(svg);
      const card = document.createElement("div");
      card.className="logoCard";
      card.innerHTML = `
        <img src="${url}" alt="logo" style="width:100%;border-radius:10px;border:1px solid rgba(0,0,0,.06)"/>
        <button class="btn" type="button">Use this logo</button>
      `;
      card.querySelector(".btn").addEventListener("click", ()=>{
        localStorage.setItem("aiLogo", url);
        alert("Logo selected! It will be used automatically in your site preview.");
      });
      root.appendChild(card);
    }
  }

  // ----------------------- events -----------------------
  function wire(){
    $("previewBtn").addEventListener("click", generatePreview);
    $("downloadBtn").addEventListener("click", downloadGate);
    $("buyBtn").addEventListener("click", startCheckout);
    $("genLogoBtn").addEventListener("click", generateLogos);

    planRadios().forEach(r => r.addEventListener("change", updatePlanUI));
    $("backgroundType").addEventListener("change", ()=> {
      $("bgUploadCol").style.display = $("backgroundType").value==="image" ? "block" : "none";
    });
    $("viewPlan").addEventListener("click", ()=>{
      alert(`Plan details:

• Basic ($20 one-time)
  - Single page + logo
  - Few gallery images

• Pro ($29/mo)
  - Adds Services, Testimonials
  - Hours/Location, Contact email

• Business ($79/mo)
  - Themes, brand color, background
  - SEO & Analytics fields

Download unlocks after payment.`);
    });

    updatePlanUI();
    refreshGate();
  }

  document.addEventListener("DOMContentLoaded", wire);
})();
