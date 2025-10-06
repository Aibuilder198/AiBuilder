/* ====== Minimal front-end controller for AI Website Builder ====== */

const $ = (sel) => document.querySelector(sel);
const els = {
  // plan radios
  planBasic:   $('#plan-basic'),
  planPro:     $('#plan-pro'),
  planBiz:     $('#plan-business'),

  // buttons
  buyBtn:      $('#buyUnlockBtn'),
  previewBtn:  $('#previewBtn'),
  downloadBtn: $('#downloadZipBtn'),

  // status
  checkoutStatus: $('#checkoutStatus'),

  // inputs
  businessName: $('#businessName'),
  businessDesc: $('#businessDescription'),
  services:     $('#services'),
  testimonials: $('#testimonials'),
  phone:        $('#phone'),
  email:        $('#email'),
  instagram:    $('#instagram'),
  ctaText:      $('#ctaText'),

  logoFile:     $('#logoFile'),
  gallery:      $('#gallery'),

  theme:        $('#theme'),
  palette:      $('#palette'),
  brandColor:   $('#brandColor'),
  bgFile:       $('#bgFile'),

  seoTitle:       $('#seoTitle'),
  seoDescription: $('#seoDescription'),
  gaId:           $('#gaId'),
  canonicalUrl:   $('#canonicalUrl'),
  allowIndex:     $('#allowIndex'),
  gscToken:       $('#gscToken'),

  previewPane:    $('#previewPane'),

  // AI logo
  aiBrand:   $('#aiBrand'),
  aiSlogan:  $('#aiSlogan'),
  aiIndustry:$('#aiIndustry'),
  aiStyle:   $('#aiStyle'),
  aiColors:  $('#aiColors'),
  aiLogoBtn: $('#aiLogoBtn'),
  aiLogoStrip: $('#aiLogoStrip'),
  aiLogoPreviewWrap: $('#aiLogoPreviewWrap'),
  aiLogoPreview: $('#aiLogoPreview'),
  useAiLogoBtn: $('#useAiLogoBtn'),
};

// -------------------- GATE DOWNLOAD UNTIL PAID --------------------
(function gateDownloadUntilPaid() {
  if (!els.downloadBtn) return;
  const sessionId = new URL(location.href).searchParams.get('session_id');
  // Default: hide
  els.downloadBtn.style.display = 'none';
  // If we have a session_id, we *may* show after verification when clicking.
  if (sessionId) {
    // Leave it hidden; click will verify before download.
    els.downloadBtn.style.display = 'inline-block';
  }
})();

// -------------------- HELPERS --------------------
function currentPlan() {
  if (els.planBiz?.checked) return 'business';
  if (els.planPro?.checked) return 'pro';
  return 'basic';
}
function toast(msg) {
  alert(msg);
}
function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
async function collectAssets() {
  // logo
  let logoDataUrl = '';
  if (els.logoFile?.files?.[0]) {
    logoDataUrl = await readFileAsDataURL(els.logoFile.files[0]);
  }

  // background
  let bgDataUrl = '';
  if (els.bgFile?.files?.[0]) {
    bgDataUrl = await readFileAsDataURL(els.bgFile.files[0]);
  }

  // gallery (limit for preview perf)
  const galleryMax = 6;
  const files = Array.from(els.gallery?.files || []).slice(0, galleryMax);
  const gallery = [];
  for (const f of files) {
    gallery.push(await readFileAsDataURL(f));
  }

  return { logoDataUrl, bgDataUrl, gallery };
}

// -------------------- PREVIEW GENERATION --------------------
function siteHtmlFromState(assets) {
  const plan = currentPlan();
  const name = els.businessName.value.trim() || 'My Business';
  const desc = els.businessDesc.value.trim();
  const services = (els.services.value || '')
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean);

  const testimonials = (els.testimonials.value || '')
    .split('\n')
    .map(line => line.split('|').map(x => x.trim()))
    .filter(parts => parts[0] && parts[1]); // [name, quote]

  const phone = els.phone.value.trim();
  const email = els.email.value.trim();
  const instagram = els.instagram.value.trim();
  const ctaText = els.ctaText.value.trim() || 'Contact Us';

  const pal = els.palette.value;
  const brand = els.brandColor.value.trim();
  const theme = els.theme.value;

  const seoTitle = els.seoTitle.value.trim() || name;
  const seoDesc  = els.seoDescription.value.trim();
  const gaId     = els.gaId.value.trim();
  const canonical= els.canonicalUrl.value.trim();
  const allowIndex = !!els.allowIndex.checked;
  const gscToken= els.gscToken.value.trim();

  // colors
  const brandColor = /^#[0-9a-f]{3,8}$/i.test(brand) ? brand : null;

  // simple theme/palette to CSS
  const paletteVars = {
    blue:    { primary: '#0ea5e9', bg: '#0b1220', card:'#0f172a', text: '#e5e7eb' },
    green:   { primary: '#22c55e', bg: '#0b1f17', card:'#0f1e17', text: '#e5e7eb' },
    purple:  { primary: '#8b5cf6', bg: '#171126', card:'#1e1638', text: '#e5e7eb' },
    warm:    { primary: '#f59e0b', bg: '#21160c', card:'#2b1b0e', text: '#f8fafc' },
    neutral: { primary: '#64748b', bg: '#0f1115', card:'#151821', text: '#e5e7eb' },
  }[pal] || { primary:'#0ea5e9', bg:'#0b1220', card:'#0f172a', text:'#e5e7eb' };

  if (brandColor) paletteVars.primary = brandColor;

  // hero/card variants
  const headerClass = theme === 'hero' ? 'hero' : 'bar';
  const sectionClass= theme === 'cards' ? 'card-grid' : 'card-flow';

  // meta
  const robots = allowIndex ? 'index, follow' : 'noindex, nofollow';
  const gscMeta = gscToken ? `<meta name="google-site-verification" content="${gscToken}">` : '';

  // services block (Pro and Business)
  const svcHtml = (plan === 'pro' || plan === 'business') && services.length
    ? `<section class="card"><h2>Services</h2><ul>${services.map(s=>`<li>${s}</li>`).join('')}</ul></section>` : '';

  // testimonials block (Pro and Business)
  const tstHtml = (plan === 'pro' || plan === 'business') && testimonials.length
    ? `<section class="card"><h2>Testimonials</h2>${testimonials.map(([n,q])=>`<blockquote>“${q}” <span>— ${n}</span></blockquote>`).join('')}</section>` : '';

  // gallery (all plans)
  const galHtml = assets.gallery?.length
    ? `<section class="card"><h2>Gallery</h2><div class="gallery">${assets.gallery.map(src=>`<img src="${src}">`).join('')}</div></section>` : '';

  // contact bar
  const contactHtml = (phone || email || instagram)
    ? `<section class="card"><div class="contact">
         ${phone ? `<a href="tel:${phone.replace(/[^\d+]/g,'')}">${phone}</a>` : ''}
         ${email ? `<a href="mailto:${email}">Email</a>` : ''}
         ${instagram ? `<a href="${instagram}" target="_blank" rel="noopener">Instagram</a>` : ''}
         <a href="#contact" class="cta">${ctaText}</a>
       </div></section>`
    : '';

  // background
  const bgStyle = assets.bgDataUrl ? `background-image:url('${assets.bgDataUrl}');` : '';

  // analytics
  const gaSnippet = gaId ? `
<script async src="https://www.googletagmanager.com/gtag/js?id=${gaId}"></script>
<script>
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', '${gaId}');
</script>` : '';

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(seoTitle)}</title>
<meta name="description" content="${escapeHtml(seoDesc)}">
<meta name="robots" content="${robots}">
${canonical ? `<link rel="canonical" href="${escapeHtml(canonical)}">` : ''}
${gscMeta}
<style>
:root {
  --primary: ${paletteVars.primary};
  --bg: ${paletteVars.bg};
  --card:${paletteVars.card};
  --text:${paletteVars.text};
}
* { box-sizing: border-box; }
body {
  margin: 0; padding: 0; font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
  color: var(--text); background: var(--bg) fixed;
  ${bgStyle} background-size: cover; background-position: center;
}
a { color: var(--primary); text-decoration: none; }
.shell { max-width: 1100px; margin: 0 auto; padding: 20px; }
header.bar { background: var(--card); border-bottom: 1px solid #00000033; }
header.hero { background: linear-gradient(160deg, var(--card), #00000055); padding: 48px 20px; }
.logo { height: 44px; width: 44px; border-radius: 8px; background:#0001; display:inline-flex; align-items:center; justify-content:center; overflow:hidden; }
.hero .title { font-size: 40px; margin: 8px 0 0; }
.card { background: color-mix(in srgb, var(--card) 96%, transparent); border:1px solid #ffffff12; padding: 20px; border-radius: 14px; margin: 16px 0; backdrop-filter: blur(8px); }
.card-flow .card { margin: 16px 0; }
.card-grid { display:grid; gap:16px; grid-template-columns: repeat(auto-fit,minmax(260px,1fr)); }
h1, h2, h3 { margin: 0 0 8px; }
.cta { background: var(--primary); color:#0b0f17; padding:10px 14px; border-radius:10px; }
.gallery { display:grid; gap:8px; grid-template-columns: repeat(auto-fit,minmax(160px,1fr)); }
.gallery img { width:100%; height:140px; object-fit:cover; border-radius:10px; }
blockquote { border-left:4px solid var(--primary); padding-left:10px; margin:10px 0; opacity:0.95;}
blockquote span { display:block; opacity:0.7; font-size:14px; margin-top:6px; }
footer { opacity:0.6; padding:30px 0; }
</style>
${gaSnippet}
</head>
<body>
<header class="${headerClass}">
  <div class="shell" style="display:flex; align-items:center; gap:14px;">
    <div class="logo">${assets.logoDataUrl ? `<img src="${assets.logoDataUrl}" alt="logo" style="width:100%;height:100%;object-fit:cover">` : ''}</div>
    <div>
      <div class="title">${escapeHtml(name)}</div>
      ${desc ? `<div>${escapeHtml(desc)}</div>` : ''}
    </div>
  </div>
</header>

<main class="shell ${sectionClass}">
  ${svcHtml}
  ${tstHtml}
  ${galHtml}
  ${contactHtml}
</main>

<footer class="shell">© ${new Date().getFullYear()} ${escapeHtml(name)}. All rights reserved.</footer>
</body>
</html>`;
  return html;
}

function escapeHtml(s='') {
  return s
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'","&#39;");
}

async function renderPreview() {
  const assets = await collectAssets();
  const html = siteHtmlFromState(assets);
  els.previewPane.innerHTML = `<iframe class="preview-frame"></iframe>`;
  const iframe = els.previewPane.querySelector('iframe');
  const blob = new Blob([html], { type: 'text/html' });
  iframe.src = URL.createObjectURL(blob);
}

// -------------------- DOWNLOAD (after verification) --------------------
async function startDownload() {
  const sessionId = new URL(location.href).searchParams.get('session_id');
  if (!sessionId) {
    toast('Please complete purchase first — the download unlocks on the success page.');
    return;
  }
  // Verify with Netlify function
  try {
    const resp = await fetch(`/.netlify/functions/verify-session?session_id=${encodeURIComponent(sessionId)}`);
    if (!resp.ok) throw new Error('Verify failed');
    const data = await resp.json();
    if (!data?.paid) {
      toast('Payment not verified yet. If you just paid, refresh this page.');
      return;
    }
  } catch (e) {
    toast('Could not verify payment. Try refreshing the page.');
    return;
  }

  // make HTML
  const assets = await collectAssets();
  const html = siteHtmlFromState(assets);

  // If JSZip available, build a simple zip with a single index.html
  if (window.JSZip) {
    const zip = new JSZip();
    zip.file('index.html', html);
    const blob = await zip.generateAsync({ type: 'blob' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'site.zip';
    a.click();
  } else {
    // fallback: single file
    const blob = new Blob([html], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'site.html';
    a.click();
  }
}

// -------------------- CHECKOUT --------------------
async function startCheckout() {
  const plan = currentPlan(); // 'basic' | 'pro' | 'business'
  els.checkoutStatus.style.display = 'inline';

  try {
    const r = await fetch('/.netlify/functions/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();
    if (!data?.url) throw new Error('No checkout URL returned');
    location.href = data.url; // Stripe Checkout
  } catch (e) {
    alert('Failed to start checkout. Check your Netlify function config and price IDs.');
  } finally {
    els.checkoutStatus.style.display = 'none';
  }
}

// -------------------- AI LOGO MAKER --------------------
async function generateAiLogos() {
  if (currentPlan() !== 'business') {
    toast('AI Logo is a Business plan feature.');
    return;
  }

  const payload = {
    brand: els.aiBrand.value.trim() || els.businessName.value.trim() || 'My Brand',
    slogan: els.aiSlogan.value.trim(),
    industry: els.aiIndustry.value.trim(),
    style: els.aiStyle.value.trim(),
    colors: els.aiColors.value.trim(),
    // Use a supported size (your function must accept one of these):
    // '1024x1024', '1024x1536', '1536x1024', or 'auto'
    size: '1024x1024'
  };

  try {
    const r = await fetch('/.netlify/functions/ai-logo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!r.ok) {
      const txt = await r.text();
      throw new Error(txt || `HTTP ${r.status}`);
    }
    // Expect function to return { images: [dataURL, ...] } or a single { image: dataURL }
    const data = await r.json();
    const images = data.images || (data.image ? [data.image] : []);
    if (!images.length) throw new Error('No images returned from AI logo function.');

    // Show selectable thumbnails
    els.aiLogoStrip.innerHTML = images.map((src, i) => `
      <button class="logo-thumb" data-idx="${i}">
        <img src="${src}" alt="AI logo ${i+1}">
      </button>`).join('');

    els.aiLogoPreviewWrap.style.display = 'none';

    els.aiLogoStrip.querySelectorAll('.logo-thumb').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = +btn.dataset.idx;
        els.aiLogoPreview.src = images[idx];
        els.aiLogoPreviewWrap.style.display = 'block';
        els.useAiLogoBtn.onclick = async () => {
          // Put chosen AI logo into the logoFile slot (simulate upload via DataURL -> Blob)
          const res = await fetch(images[idx]);
          const blob = await res.blob();
          const file = new File([blob], 'ai-logo.png', { type: blob.type || 'image/png' });
          // Fill a DataTransfer to set on file input
          const dt = new DataTransfer();
          dt.items.add(file);
          els.logoFile.files = dt.files;
          toast('Logo applied!');
        };
      });
    });
  } catch (e) {
    alert(`AI logo error: ${e.message}`);
  }
}

// -------------------- EVENTS --------------------
els.previewBtn?.addEventListener('click', renderPreview);
els.downloadBtn?.addEventListener('click', startDownload);
els.buyBtn?.addEventListener('click', startCheckout);
els.aiLogoBtn?.addEventListener('click', generateAiLogos);
