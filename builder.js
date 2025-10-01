// ---------- helpers ----------
const $ = (id) => document.getElementById(id);

// read a File -> data URL (base64) promise
const fileToDataURL = (file) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });

// Load meta.json (with safe defaults if missing)
async function loadMeta() {
  try {
    const res = await fetch('/meta.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('meta.json missing');
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

// build full HTML using user inputs + data URLs
function buildSiteHTML({
  businessName,
  description,
  brandColor = "#0ea5e9",
  logoDataURL,
  galleryDataURLs = [],
  ctaText = "Contact Us",
  email = "hello@example.com",
  phone = "",
  instagram = ""
}) {
  const safe = (s = "") => (s || "").toString();

  const galleryHTML = galleryDataURLs.length
    ? `
    <section class="card">
      <h2>Gallery</h2>
      <div class="grid">
        ${galleryDataURLs
          .map(
            (src) => `<figure class="thumb">
              <img src="${src}" alt="Gallery image"/>
            </figure>`
          )
          .join("")}
      </div>
    </section>`
    : "";

  const contactBits = [
    email ? `<a class="contact" href="mailto:${safe(email)}">Email: ${safe(email)}</a>` : "",
    phone ? `<div class="contact">Phone: ${safe(phone)}</div>` : "",
    instagram ? `<a class="contact" href="${safe(instagram)}" target="_blank" rel="noopener">Instagram</a>` : ""
  ]
    .filter(Boolean)
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${safe(businessName)}</title>
<style>
  :root { --bg:#f8fafc; --ink:#0f172a; --card:#ffffff; --brand:${brandColor}; --muted:#475569; }
  * { box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; margin:0; color:var(--ink); background:var(--bg); }
  header { background:var(--brand); color:#fff; padding:26px 20px; display:flex; align-items:center; gap:14px; }
  header img.logo { height:44px; width:auto; border-radius:8px; background:#fff; padding:4px; }
  header h1 { margin:0; font-size:28px; line-height:1.2; }
  main { max-width:980px; margin:28px auto; padding:0 16px; }
  .card { background:var(--card); border-radius:14px; box-shadow:0 6px 20px rgba(15,23,42,.08); padding:22px; margin-bottom:22px; }
  .cta { display:inline-block; margin-top:14px; background:var(--brand); color:#fff; padding:10px 16px; border-radius:10px; text-decoration:none; }
  footer { text-align:center; color:var(--muted); padding:24px 12px; }
  .grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap:12px; margin-top:10px; }
  .thumb { border-radius:12px; overflow:hidden; background:#fff; box-shadow:0 2px 12px rgba(15,23,42,.06); }
  .thumb img { width:100%; height:160px; object-fit:cover; display:block; }
  .contact { display:inline-block; margin-right:12px; color:var(--brand); text-decoration:none; }
</style>
</head>
<body>
  <header>
    ${logoDataURL ? `<img class="logo" src="${logoDataURL}" alt="Logo">` : ""}
    <h1>${safe(businessName)}</h1>
  </header>

  <main>
    <section class="card">
      <h2>About Us</h2>
      <p>${safe(description)}</p>
      <a class="cta" href="mailto:${safe(email) || "hello@example.com"}">${safe(ctaText) || "Contact Us"}</a>
    </section>

    ${galleryHTML}

    <section class="card">
      <h2>Contact</h2>
      ${contactBits || "<p>Reach out to us any time.</p>"}
    </section>
  </main>

  <footer>© ${new Date().getFullYear()} ${safe(businessName)}. All rights reserved.</footer>
</body>
</html>`;
}

document.addEventListener('DOMContentLoaded', async () => {
  const meta = await loadMeta();
  console.log("Loaded meta:", meta);

  const form = $("builderForm");
  const nameInput = $("businessName");
  const descInput = $("description");
  const brandColorInput = $("brandColor");
  const logoInput = $("logo");
  const galleryInput = $("gallery");
  const ctaTextInput = $("ctaText");
  const emailInput = $("email");
  const phoneInput = $("phone");
  const igInput = $("instagram");

  let lastGeneratedHtml = ""; // used by checkout if user didn't press Generate

  async function collectFormDataAsHTML() {
    const businessName = (nameInput?.value || "").trim();
    const description  = (descInput?.value || "").trim();
    const brandColor   = brandColorInput?.value || "#0ea5e9";
    const ctaText      = (ctaTextInput?.value || "Contact Us").trim();
    const email        = (emailInput?.value || "hello@example.com").trim();
    const phone        = (phoneInput?.value || "").trim();
    const instagram    = (igInput?.value || "").trim();

    // read images to data URLs
    let logoDataURL = "";
    if (logoInput?.files?.[0]) {
      logoDataURL = await fileToDataURL(logoInput.files[0]);
    }
    const galleryDataURLs = [];
    if (galleryInput?.files?.length) {
      const files = Array.from(galleryInput.files).slice(0, 12); // limit to 12 images
      for (const f of files) {
        // simple size guard (~1.5MB)
        if (f.size <= 1.5 * 1024 * 1024) {
          galleryDataURLs.push(await fileToDataURL(f));
        }
      }
    }

    return buildSiteHTML({
      businessName,
      description,
      brandColor,
      logoDataURL,
      galleryDataURLs,
      ctaText,
      email,
      phone,
      instagram
    });
  }

  // ---------- Generate Website (preview + download) ----------
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      // build HTML from form + images
      lastGeneratedHtml = await collectFormDataAsHTML();

      // preview
      let preview = $("preview");
      if (!preview) {
        preview = document.createElement("div");
        preview.id = "preview";
        preview.style.marginTop = "20px";
        form.parentElement.appendChild(preview);
      }
      preview.innerHTML = "";

      const iframe = document.createElement("iframe");
      iframe.style.width = "100%";
      iframe.style.height = "600px";
      iframe.style.border = "1px solid #e2e8f0";
      iframe.title = "Generated site preview";
      preview.appendChild(iframe);

      const doc = iframe.contentDocument || iframe.contentWindow.document;
      doc.open();
      doc.write(lastGeneratedHtml);
      doc.close();

      // download button
      const businessName = (nameInput?.value || "site").trim();
      let dl = $("downloadSite");
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

  // ---------- Stripe Checkout ----------
  const checkoutBtn = $("checkoutBtn");
  if (meta.features?.checkout && checkoutBtn) {
    checkoutBtn.addEventListener("click", async () => {
      checkoutBtn.disabled = true;
      try {
        // If user never clicked Generate, still collect inputs & images
        if (!lastGeneratedHtml) {
          lastGeneratedHtml = await collectFormDataAsHTML();
        }

        const businessName = (nameInput?.value || "").trim();
        const description  = (descInput?.value || "").trim();

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
              // base64 the entire HTML; server will chunk it into metadata-safe pieces
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
