// === DROP-IN REPLACEMENT for buildSiteHTML in builder.js ===
function buildSiteHTML(opts) {
  const {
    businessName, description, brandColor, theme, font,
    logoDataURL, galleryDataURLs = [],
    ctaText, email, phone, instagram,
    servicesText = "", testimonialsText = "", hoursText = "", address = "",
    // any other fields you pass are fine; they’ll be ignored
  } = opts;

  // helpers
  const toLines = (t) => (t || "").split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const services = toLines(servicesText);
  const testimonials = toLines(testimonialsText)
    .map(row => {
      const [name, quote] = row.split("|").map(s => (s || "").trim());
      return (name && quote) ? { name, quote } : null;
    })
    .filter(Boolean);
  const hours = toLines(hoursText);

  // fonts (keep your picker working)
  const GF = {
    "Inter": "Inter:wght@400;600;700",
    "Poppins": "Poppins:wght@400;600;700",
    "Playfair Display": "Playfair+Display:wght@400;600;700"
  };
  const fontHref = GF[font] ? `https://fonts.googleapis.com/css2?family=${GF[font]}&display=swap` : "";
  const fontStack = font === "system-ui"
    ? "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif"
    : `'${font}', system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif`;

  // content blocks
  const contactBits = [
    email ? `<a class="contact" href="mailto:${email}">Email: ${email}</a>` : "",
    phone ? `<span class="contact">Phone: ${phone}</span>` : "",
    instagram ? `<a class="contact" href="${instagram}" target="_blank" rel="noopener">Instagram</a>` : ""
  ].filter(Boolean).join(" ");

  const galleryHTML = galleryDataURLs.length ? `
    <section class="card">
      <h2>Gallery</h2>
      <div class="grid">
        ${galleryDataURLs.map(src => `<figure class="thumb"><img src="${src}" alt="Image"></figure>`).join("")}
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
      <div class="testis">
        ${testimonials.map(t => `<blockquote><p>“${t.quote}”</p><footer>— ${t.name}</footer></blockquote>`).join("")}
      </div>
    </section>` : "";

  const hoursHTML = (hours.length || address) ? `
    <section class="card">
      <h2>Hours & Location</h2>
      ${hours.length ? `<ul class="list">${hours.map(h => `<li>${h}</li>`).join("")}</ul>` : ""}
      ${address ? `<p class="address">${address}</p>` : ""}
    </section>` : "";

  // FINAL HTML with **Option 2** background (professional photo)
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
    color:#fff; /* white text over photo */
    font-family:${fontStack};
    background:
      url("https://images.unsplash.com/photo-1503264116251-35a269479413?auto=format&fit=crop&w=1920&q=80")
      no-repeat center center fixed;
    background-size:cover;
  }

  /* translucent gradient veil to improve readability */
  .veil{
    min-height:100%;
    background: linear-gradient(180deg, rgba(0,0,0,.35) 0%, rgba(0,0,0,.55) 100%);
    display:flex;
    flex-direction:column;
  }

  header.bar{
    padding:22px 16px;
    display:flex;
    align-items:center;
    gap:12px;
  }
  header .logo{
    height:44px; width:auto; border-radius:8px;
    background:#fff; padding:4px;
    box-shadow:0 4px 18px rgba(0,0,0,.25);
  }
  header h1{ margin:0; font-size:28px; text-shadow:0 2px 10px rgba(0,0,0,.4); }

  main{
    max-width:1000px;
    width:100%;
    margin:24px auto 40px;
    padding:0 16px;
  }

  /* translucent cards floating above background */
  .card{
    background: rgba(255,255,255,.92);
    color: var(--ink);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    border-radius:14px;
    box-shadow: 0 10px 30px rgba(0,0,0,.25);
    padding:22px;
    margin-bottom:22px;
  }
  h2{ margin:0 0 10px; color: var(--ink); }
  p{ margin:0 0 8px }
  .cta{
    display:inline-block; margin-top:12px;
    background:var(--brand); color:#fff; text-decoration:none;
    padding:10px 16px; border-radius:10px;
    box-shadow:0 6px 14px rgba(2,132,199,.35);
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

  footer{
    text-align:center; color:#e5e7eb; padding:24px 12px;
    text-shadow:0 2px 10px rgba(0,0,0,.4);
  }

  /* make first “About” card pop a bit more */
  .card.hero { background: rgba(255,255,255,.96); }

  @media (max-width:900px){
    header h1{ font-size:24px }
  }
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
