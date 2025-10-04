<!-- logo-ai.js -->
<script>
/* =========================================================
   AI-Style Procedural Logo Generator (client-only, SVG)
   - Creates multiple SVG logo variations from inputs
   - Lets user insert chosen logo into the builder
   ========================================================= */

(function () {
  // --- Small curated symbol set by industry keyword ---
  const SYMBOLS = {
    lawn: ["🌿", "🌱", "🍃", "🌾"],
    cleaning: ["🧼", "✨", "🫧", "🧽"],
    food: ["🍔", "🍕", "🍜", "🍰", "🥗"],
    coffee: ["☕", "🍃"],
    fashion: ["👗", "👜", "✨"],
    tech: ["⚙️", "💡", "🔧", "🧠"],
    beauty: ["💄", "🌸", "✨"],
    fitness: ["💪", "🏃‍♂️", "🏋️‍♀️"],
    pet: ["🐾", "🐶", "🐱"],
    default: ["★", "◆", "●", "▲"]
  };

  // --- Font stack choices (system-safe + one display) ---
  const FONTS = {
    modern: "Inter, Segoe UI, Roboto, Arial, sans-serif",
    elegant: "Georgia, Times, serif",
    friendly: "Nunito, Segoe UI, Roboto, Arial, sans-serif",
    bold: "Poppins, Segoe UI, Roboto, Arial, sans-serif",
  };

  // --- Palette suggestions ---
  function suggestPalette(industry, style) {
    const key = (industry || "").toLowerCase();
    if (key.includes("lawn") || key.includes("landscap")) {
      return ["#0ea5e9", "#10b981", "#0f172a", "#f1f5f9"];
    }
    if (key.includes("clean")) {
      return ["#22d3ee", "#6366f1", "#0f172a", "#ffffff"];
    }
    if (key.includes("coffee") || key.includes("cafe")) {
      return ["#6b4f37", "#d6ad86", "#231a15", "#fff7ed"];
    }
    if (key.includes("tech")) {
      return ["#6366f1", "#22d3ee", "#0b1221", "#eaf0ff"];
    }
    // style hints
    if ((style || "").toLowerCase().includes("elegant")) {
      return ["#1f2937", "#111827", "#f9fafb", "#d1d5db"];
    }
    // default
    return ["#2563eb", "#f59e0b", "#0b1221", "#f8fafc"];
  }

  function pickSymbol(industry, fallbackMonogram) {
    const k = (industry || "").toLowerCase();
    const pool =
      k.includes("lawn") || k.includes("landscap") ? SYMBOLS.lawn :
      k.includes("clean") ? SYMBOLS.cleaning :
      k.includes("food") || k.includes("restaurant") ? SYMBOLS.food :
      k.includes("coffee") || k.includes("cafe") ? SYMBOLS.coffee :
      k.includes("fashion") ? SYMBOLS.fashion :
      k.includes("tech") || k.includes("it") ? SYMBOLS.tech :
      k.includes("beauty") ? SYMBOLS.beauty :
      k.includes("fitness") ? SYMBOLS.fitness :
      k.includes("pet") ? SYMBOLS.pet :
      SYMBOLS.default;

    // 50% chance to use emoji, else monogram fallback
    return Math.random() > 0.5 ? pool[Math.floor(Math.random()*pool.length)] : fallbackMonogram;
  }

  function chooseFont(style) {
    const s = (style || "").toLowerCase();
    if (s.includes("elegant")) return FONTS.elegant;
    if (s.includes("friendly")) return FONTS.friendly;
    if (s.includes("bold")) return FONTS.bold;
    return FONTS.modern;
  }

  function sanitize(text) { return (text || "").replace(/[<>]/g, ""); }

  // --- Build a single SVG string variation ---
  function buildSVG({ name, slogan, colors, layout, symbol, font }) {
    const [brand, accent, bg, light] = colors;
    const safeName = sanitize(name);
    const safeSlogan = sanitize(slogan || "");

    // shared CSS
    const css = `
      .card { rx:18; }
      .title { font: 800 42px ${font}; fill: ${bg === "#0b1221" ? "#ffffff" : "#0f172a"}; }
      .slogan { font: 600 16px ${font}; fill: ${bg === "#0b1221" ? "#e5e7eb" : "#334155"}; }
      .badge { fill: ${brand}; }
      .ring { stroke:${accent}; stroke-width:8; fill:none; }
      .icon { font: 48px ${font}; }
      .mono { font: 700 42px ${font}; fill:#fff }
    `;

    const monogram = safeName ? safeName.split(/\s+/).map(w => w[0]).slice(0,2).join("").toUpperCase() : "AA";

    // Layouts:
    // 1) Icon top, text under
    if (layout === "icon-top") {
      return `
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
  <style>${css}</style>
  <rect class="card" x="12" y="12" width="616" height="336" fill="${light}" />
  <circle class="ring" cx="320" cy="110" r="44"/>
  <circle cx="320" cy="110" r="34" class="badge"/>
  <text class="icon" x="320" y="127" text-anchor="middle">${symbol}</text>
  <text class="title" x="320" y="210" text-anchor="middle">${safeName}</text>
  ${safeSlogan ? `<text class="slogan" x="320" y="242" text-anchor="middle">${safeSlogan}</text>` : ""}
</svg>`;
    }

    // 2) Icon left, text right
    if (layout === "icon-left") {
      return `
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="240" viewBox="0 0 640 240">
  <style>${css}</style>
  <rect class="card" x="12" y="12" width="616" height="216" fill="${light}" />
  <circle class="ring" cx="110" cy="120" r="44"/>
  <circle cx="110" cy="120" r="34" class="badge"/>
  <text class="icon" x="110" y="127" text-anchor="middle">${symbol}</text>
  <text class="title" x="190" y="112">${safeName}</text>
  ${safeSlogan ? `<text class="slogan" x="190" y="148">${safeSlogan}</text>` : ""}
</svg>`;
    }

    // 3) Monogram badge
    if (layout === "monogram") {
      return `
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="240" viewBox="0 0 640 240">
  <style>${css}</style>
  <rect class="card" x="12" y="12" width="616" height="216" fill="${brand}" />
  <circle cx="120" cy="120" r="44" fill="${accent}"/>
  <text class="mono" x="120" y="134" text-anchor="middle">${monogram}</text>
  <text class="title" x="200" y="112" fill="#fff">${safeName}</text>
  ${safeSlogan ? `<text class="slogan" x="200" y="148" fill="#f1f5f9">${safeSlogan}</text>` : ""}
</svg>`;
    }

    // 4) Shield/badge centered
    return `
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
  <style>${css}</style>
  <rect class="card" x="12" y="12" width="616" height="336" fill="${light}" />
  <rect x="265" y="74" width="110" height="60" rx="8" fill="${brand}" />
  <rect x="275" y="84" width="90" height="40" rx="6" fill="${accent}" opacity=".9"/>
  <text class="icon" x="320" y="112" text-anchor="middle" fill="#fff">${symbol}</text>
  <text class="title" x="320" y="210" text-anchor="middle">${safeName}</text>
  ${safeSlogan ? `<text class="slogan" x="320" y="242" text-anchor="middle">${safeSlogan}</text>` : ""}
</svg>`;
  }

  // --- Generate N variations ---
  function generateLogos({ name, slogan, industry, style, palette }) {
    const colors = palette && palette.length === 4 ? palette : suggestPalette(industry, style);
    const font = chooseFont(style);
    const monogram = (name || "AA")
      .split(/\s+/).map(w => w[0]).slice(0,2).join("").toUpperCase();

    const symbol = pickSymbol(industry, monogram);
    const layouts = ["icon-top", "icon-left", "monogram", "badge"];
    const svgs = layouts.map((layout) =>
      buildSVG({ name, slogan, colors, layout, symbol, font })
    );
    return svgs;
  }

  // --- Export helpers ---
  function svgToDataURL(svg) {
    return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
  }
  function svgToPngDataURL(svg, width=640, height=360) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const c = document.createElement("canvas");
        c.width = width;
        c.height = height;
        const ctx = c.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0,0,width,height);
        ctx.drawImage(img, 0,0,width,height);
        resolve(c.toDataURL("image/png"));
      };
      img.onerror = reject;
      img.src = svgToDataURL(svg);
    });
  }

  // --- UI glue for index.html ---
  async function handleGenerateUI() {
    const name = document.getElementById("logoName").value.trim() || document.getElementById("businessName").value.trim();
    const slogan = document.getElementById("logoSlogan").value.trim();
    const industry = document.getElementById("logoIndustry").value.trim();
    const style = document.getElementById("logoStyle").value;
    const custom = document.getElementById("logoCustomColors").value.trim();
    const palette = custom ? custom.split(",").map(s=>s.trim()).slice(0,4) : null;

    const svgs = generateLogos({ name, slogan, industry, style, palette });
    const out = document.getElementById("logoResults");
    out.innerHTML = "";

    for (const svg of svgs) {
      const card = document.createElement("div");
      card.style = "background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.2);border-radius:12px;padding:12px;display:grid;gap:8px";

      const img = document.createElement("img");
      img.src = svgToDataURL(svg);
      img.style = "width:100%;border-radius:8px;background:#fff";
      card.appendChild(img);

      const row = document.createElement("div");
      row.style = "display:flex;gap:8px;flex-wrap:wrap";

      const useBtn = document.createElement("button");
      useBtn.textContent = "Use this logo";
      useBtn.style = "padding:8px 12px;border:0;border-radius:10px;background:#16a34a;color:#fff;font-weight:800;cursor:pointer";
      useBtn.onclick = async () => {
        // Store as SVG data URL in localStorage so builder.js can read it as fallback logo
        localStorage.setItem("aiLogo", img.src);
        alert("Logo selected! It will be used if no manual file is uploaded.");
      };

      const pngBtn = document.createElement("button");
      pngBtn.textContent = "Download PNG";
      pngBtn.style = "padding:8px 12px;border:0;border-radius:10px;background:#2563eb;color:#fff;font-weight:800;cursor:pointer";
      pngBtn.onclick = async () => {
        const png = await svgToPngDataURL(svg);
        const a = document.createElement("a");
        a.href = png;
        a.download = (name || "logo") + ".png";
        a.click();
      };

      const svgBtn = document.createElement("button");
      svgBtn.textContent = "Download SVG";
      svgBtn.style = "padding:8px 12px;border:0;border-radius:10px;background:#0ea5e9;color:#0b1221;font-weight:800;cursor:pointer";
      svgBtn.onclick = () => {
        const a = document.createElement("a");
        const blob = new Blob([svg], { type: "image/svg+xml" });
        a.href = URL.createObjectURL(blob);
        a.download = (name || "logo") + ".svg";
        a.click();
      };

      row.appendChild(useBtn);
      row.appendChild(pngBtn);
      row.appendChild(svgBtn);
      card.appendChild(row);
      out.appendChild(card);
    }
  }

  // Expose
  window.__LogoAI__ = {
    suggestPalette,
    generateLogos,
    handleGenerateUI
  };
})();
</script>
