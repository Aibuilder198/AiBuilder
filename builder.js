// ---------- helpers ----------
function $(id) { return document.getElementById(id); }

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

document.addEventListener('DOMContentLoaded', async () => {
  const meta = await loadMeta();
  console.log("Loaded meta:", meta);

  // ---------- Generate Website (form submit) ----------
  const form = $("builderForm");
  const nameInput = $("businessName");
  const descInput = $("description");

  let lastGeneratedHtml = ""; // store HTML so checkout can reuse

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const businessName = (nameInput?.value || "").trim();
      const description  = (descInput?.value || "").trim();

      if (!businessName || !description) {
        alert("Please enter both a Business Name and a Business Description.");
        return;
      }

      // Build a simple one-page site
      lastGeneratedHtml = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${businessName}</title>
<style>
  :root { --bg:#f8fafc; --ink:#0f172a; --card:#ffffff; --brand:#0ea5e9; --muted:#475569; }
  * { box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; margin:0; color:var(--ink); background:var(--bg); }
  header { background:var(--brand); color:#fff; padding:28px 20px; }
  header h1 { margin:0; font-size:28px; line-height:1.2; }
  main { max-width:900px; margin:28px auto; padding:0 16px; }
  .card { background:var(--card); border-radius:14px; box-shadow:0 6px 20px rgba(15,23,42,.08); padding:22px; }
  .cta { display:inline-block; margin-top:14px; background:var(--brand); color:#fff; padding:10px 16px; border-radius:10px; text-decoration:none; }
  footer { text-align:center; color:var(--muted); padding:24px 12px; }
</style>
</head>
<body>
  <header><h1>${businessName}</h1></header>
  <main>
    <section class="card">
      <h2>About Us</h2>
      <p>${description}</p>
      <a class="cta" href="mailto:hello@example.com">Contact Us</a>
    </section>
  </main>
  <footer>© ${new Date().getFullYear()} ${businessName}. All rights reserved.</footer>
</body>
</html>`;

      // Live preview below the form
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
      iframe.style.height = "480px";
      iframe.style.border = "1px solid #e2e8f0";
      iframe.title = "Generated site preview";
      preview.appendChild(iframe);

      const doc = iframe.contentDocument || iframe.contentWindow.document;
      doc.open();
      doc.write(lastGeneratedHtml);
      doc.close();

      // Download button
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
      const url = URL.createObjectURL(blob);
      dl.href = url;
      dl.download = `${businessName.replace(/\s+/g, "-").toLowerCase()}-site.html`;
    });
  } else {
    console.warn("#builderForm not found");
  }

  // ---------- Stripe Checkout ----------
  const checkoutBtn = $("checkoutBtn");
  if (meta.features?.checkout && checkoutBtn) {
    checkoutBtn.addEventListener("click", async () => {
      checkoutBtn.disabled = true;
      try {
        const businessName = (nameInput?.value || "").trim();
        const description  = (descInput?.value || "").trim();

        // If user never clicked Generate, build HTML here too
        if (!lastGeneratedHtml && businessName && description) {
          lastGeneratedHtml = `<html><body><h1>${businessName}</h1><p>${description}</p></body></html>`;
        }

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
              htmlBase64: lastGeneratedHtml
                ? btoa(unescape(encodeURIComponent(lastGeneratedHtml)))
                : ""
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
