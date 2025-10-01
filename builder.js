/* ===== helpers ===== */
const byId = (id) => document.getElementById(id);

// turn a File into a data URL
async function fileToDataURL(file) {
  const r = new FileReader();
  return new Promise((res, rej) => {
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

/* ===== site generator (Option 2: professional photo background) ===== */
function buildSiteHTML(opts) {
  const {
    businessName, description, brandColor, theme, font,
    logoDataURL, galleryDataURLs = [],
    ctaText, email, phone, instagram,
    servicesText = "", testimonialsText = "", hoursText = "", address = "",
  } = opts;

  const toLines = (t) => (t || "").split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const services = toLines(servicesText);
  const testimonials = toLines(testimonialsText)
    .map(row => {
      const [name, quote] = row.split("|").map(s => (s || "").trim());
      return (name && quote) ? { name, quote } : null;
    })
    .filter(Boolean);
  const hours = toLines(hoursText);

  const GF = {
    "Inter": "Inter:wght@400;600;700",
    "Poppins": "Poppins:wght@400;600;700",
    "Playfair Display": "Playfair+Display:wght@400;600;700",
  };
  const fontHref = GF?.[font] ? `https://fonts.googleapis.com/css2?family=${GF[font]}&display=swap` : "";
  const fontStack =
    font === "system-ui"
      ? "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif"
      : `'${font}', system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif`;

  const contactBits = [
    email ? `<a class="contact" href="mailto:${email}">Email: ${email}</a>` : "",
    phone ? `<span class="contact">Phone: ${phone}</span>` : "",
    instagram ? `<a class="contact" href="${instagram}" target="_blank" rel="noopener">Instagram</a>` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const galleryHTML = galleryDataURLs.length
    ? `<section class="card">
         <h2>Gallery</h2>
         <div class="grid">
           ${galleryDataURLs
             .map((src) => `<figure class="thumb"><img src="${src}" alt="Image"></figure>`)
             .join("")}
         </div>
       </section>`
    : "";

  const servicesHTML = services.length
    ? `<section class="card">
         <h2>Services</h2>
         <ul class="list">${services.map((s) => `<li>${s}</li>`).join("")}</ul>
       </section>`
    : "";

  const testimonialsHTML = testimonials.length
    ? `<section class="card">
         <h2>Testimonials</h2>
         <div class="testis">
           ${testimonials
             .map(
               (t) =>
                 `<blockquote><p>“${t.quote}”</p><footer>— ${t.name}</footer></blockquote>`
             )
             .join("")}
         </div>
       </section>`
    : "";

  const hoursHTML =
    hours.length || address
      ? `<section class="card">
           <h2>Hours & Location</h2>
           ${hours.length ? `<ul class="list">${hours.map((h) => `<li>${h}</li>`).join("")}</ul>` : ""}
           ${address ? `<p class="address">${address}</p>` : ""}
         </section>`
      : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${businessName}</title>
${fontHref ? `<link href="${fontHref}" rel="stylesheet">` : ""}
<style>
  :root{
    --brand:${brandColor || "#0ea5e9"};
    --ink:#0f172a;
    --muted:#475569;
    --card:#ffffff;
  }
  *{ box-sizing:border-box }
  html,body{ height:100% }
  body{
    margin:0;
    color:#fff;
    font-family:${fontStack};
    background:
      url("https://images.unsplash.com/photo-1503264116251-35a269479413?auto=format&fit=crop&w=1920&q=80")
      no-repeat center center fixed;
    background-size:cover;
  }
  .veil{
    min-height:100%;
    background: linear-gradient(180deg, rgba(0,0,0,.35) 0%, rgba(0,0,0,.55) 100%);
    display:flex; flex-direction:column;
  }
  header.bar{
    padding:22px 16px; display:flex; align-items:center; gap:12px;
  }
  header .logo{
    height:44px; width:auto; border-radius:8px; background:#fff; padding:4px;
    box-shadow:0 4px 18px rgba(0,0,0,.25);
  }
  header h1{ margin:0; font-size:28px; text-shadow:0 2px 10px rgba(0,0,0,.4); }

  main{ max-width:1000px; width:100%; margin:24px auto 40px; padding:0 16px; }

  .card{
    background: rgba(255,255,255,.92);
    color: var(--ink);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    border-radius:14px;
    box-shadow: 0 10px 30px rgba(0,0,0,.25);
    padding:22px; margin-bottom:22px;
  }
  .card.hero{ background: rgba(255,255,255,.96); }
  h2{ margin:0 0 10px; color: var(--ink); }
  p{ margin:0 0 8px }
  .cta{
    display:inline-block; margin-top:12px; background:var(--brand); color:#fff; text-decoration:none;
    padding:10px 16px; border-radius:10px; box-shadow:0 6px 14px rgba(2,132,199,.35);
  }
  .grid{ display:grid; grid-template-columns: repeat(auto-fill,minmax(180px,1fr)); gap:12px; margin-top:10px; }
  .thumb{ border-radius:12px; overflow:hidden; background:#fff; box-shadow:0 2px 12px rgba(15,23,42,.2); }
  .thumb img{ width:100%; height:160px; object-fit:cover; display:block; }
  .list{ padding-left:18px; }
  .testis{ display:grid; gap:12px; }
  blockquote{ margin:0; padding:14px; background:#ffffff15; border-left:4px solid var(--brand); border-radius:10px; color:#111827; }
  blockquote p{ margin:0 0 6px }
  blockquote footer{ font-size:14px; color:#334155 }
  .contact{ display:inline-block; margin-right:12px; color:var(--brand); text-decoration:none; }
  .address{ margin-top:8px; color:#111827 }
  footer{ text-align:center; color:#e5e7eb; padding:24px 12px; text-shadow:0 2px 10px rgba(0,0,0,.4); }
</style>
</head>
<body>
  <div class="veil">
    <header class="bar">
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

      <section class="card">
        <h2>Contact</h2>
        ${contactBits || "<p style='color:#334155'>Reach out any time.</p>"}
      </section>
    </main>

    <footer>© ${new Date().getFullYear()} ${businessName}. All rights reserved.</footer>
  </div>
</body>
</html>`;
}

/* ===== collect inputs -> build HTML ===== */
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

  let logoDataURL = "";
  const logoInput = byId("logo");
  if (logoInput?.files?.[0]) logoDataURL = await fileToDataURL(logoInput.files[0]);

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
    servicesText, testimonialsText, hoursText, address,
  });
}

/* ===== preview (Generate Website) ===== */
(function wireGenerate() {
  const form = byId("builderForm");
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const html = await collectFormAsHTML();
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);

      // show preview + download link
      let preview = document.getElementById("previewArea");
      if (!preview) {
        preview = document.createElement("div");
        preview.id = "previewArea";
        form.parentElement.appendChild(preview);
      }
      preview.innerHTML = `
        <p><strong>Preview:</strong></p>
        <iframe src="${url}" width="100%" height="620" style="border:1px solid #e2e8f0;border-radius:12px;"></iframe>
        <br/>
        <a href="${url}" download="site.html" class="cta">Download Your Site</a>
      `;
    } catch (err) {
      console.error(err);
      alert("Could not generate site. See console for details.");
    }
  });
})();

/* ===== Stripe checkout (Buy Full Website) ===== */
(function wireCheckout() {
  const btn = byId("checkoutBtn");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    btn.disabled = true;
    try {
      const html = await collectFormAsHTML();

      // send BOTH a cart item and the site payload (widely compatible with your earlier Netlify fn)
      const res = await fetch("/.netlify/functions/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ price: "price_1SDFSNAmJkffDNdt0pAhcn8Y", quantity: 1 }],
          success_url: `${window.location.origin}/success`,
          cancel_url: `${window.location.origin}/cancel`,
          sitePayload: {
            businessName: byId("businessName")?.value || "",
            description: byId("description")?.value || "",
            htmlBase64: btoa(unescape(encodeURIComponent(html)))
          }
        })
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }
      const data = await res.json();
      if (data?.url) {
        window.location.href = data.url;
      } else {
        alert("Checkout failed (no URL returned).");
      }
    } catch (err) {
      console.error("Checkout error:", err);
      alert("Checkout failed. See console for details.");
    } finally {
      btn.disabled = false;
    }
  });
})();
