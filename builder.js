// ---- helpers ----
function $(id) { return document.getElementById(id); }

// Load meta.json dynamically (keeps your previous behavior)
async function loadMeta() {
  try {
    const res = await fetch('/meta.json');
    if (!res.ok) throw new Error('meta.json missing');
    return await res.json();
  } catch (err) {
    console.warn('Using defaults, meta.json not found');
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

  // --- Wire up form submit (Generate Website) ---
  const form = $('builderForm');
  const nameInput = $('businessName');
  const descInput = $('description');

  if (!form) {
    console.error('builder.js: #builderForm not found in DOM');
  } else {
    console.log('builder.js: attaching submit handler to #builderForm');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const businessName = (nameInput?.value || '').trim();
      const description  = (descInput?.value || '').trim();

      if (!businessName || !description) {
        alert('Please enter both a Business Name and a Business Description.');
        return;
      }

      // Your original action
      alert(`AI is generating a website for ${businessName}...\nDescription: ${description}`);

      // Optional: show a simple preview section on the page
      // (uncomment if you want to see something happen visually)
      /*
      let preview = document.getElementById('preview');
      if (!preview) {
        preview = document.createElement('div');
        preview.id = 'preview';
        preview.style.marginTop = '20px';
        form.parentElement.appendChild(preview);
      }
      preview.innerHTML = `
        <h2>Preview for ${businessName}</h2>
        <p>${description}</p>
      `;
      */
    });
  }

  // --- Wire up Stripe Checkout button ---
  const checkoutBtn = $('checkoutBtn');
  if (meta.features.checkout && checkoutBtn) {
    checkoutBtn.addEventListener('click', async () => {
      console.log('builder.js: checkout clicked');
      checkoutBtn.disabled = true;

      try {
        const res = await fetch("/.netlify/functions/create-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: [{ price: meta.stripe?.priceId || "price_1SDFSNAmJkffDNdt0pAhcn8Y", quantity: 1 }],
            success_url: `${window.location.origin}/success`,
            cancel_url: `${window.location.origin}/cancel`
          })
        });

        if (!res.ok) {
          const text = await res.text();
          console.error("Checkout failed:", text);
          alert(`Checkout failed: ${text}`);
          return;
        }

        const data = await res.json();
        if (data.url) window.location.href = data.url;
      } catch (err) {
        console.error('Checkout error:', err);
        alert('There was a problem starting checkout. See console for details.');
      } finally {
        checkoutBtn.disabled = false;
      }
    });
  } else if (checkoutBtn) {
    console.log('builder.js: checkout feature disabled, hiding button');
    checkoutBtn.style.display = 'none';
  }
});
