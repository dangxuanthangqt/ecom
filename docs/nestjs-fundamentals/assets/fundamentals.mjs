// Shared behavior for the Markdown-generated foundation pages.
const themeToggle = document.getElementById("themeToggle");
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  themeToggle.textContent = theme === "dark" ? "☀" : "☾";
}
let initialTheme = matchMedia("(prefers-color-scheme: dark)").matches
  ? "dark"
  : "light";
try {
  initialTheme = localStorage.getItem("fundamentals-theme") ?? initialTheme;
} catch {
  // Storage can be unavailable when opening a local HTML file.
}
applyTheme(initialTheme);
themeToggle.addEventListener("click", () => {
  const theme =
    document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  try {
    localStorage.setItem("fundamentals-theme", theme);
  } catch {
    // Storage can be unavailable when opening a local HTML file.
  }
  applyTheme(theme);
});

let mermaid;
try {
  ({ default: mermaid } = await import(
    "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs"
  ));
} catch {
  document.querySelectorAll(".diagram-shell").forEach((shell) => {
    shell.querySelector(".mermaid-wrap").hidden = true;
    shell.querySelector(".diagram-code").open = true;
  });
}
if (mermaid) {
  const config = {
    fitPadding: 28,
    minHeight: 320,
    maxHeightPx: 960,
    maxHeightVh: 0.84,
    maxInitialZoom: 1.8,
    minZoom: 0.08,
    maxZoom: 6.5,
    zoomStep: 0.14,
    readabilityFloor: 0.58,
  };
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  let activeDrag = null;
  addEventListener("mousemove", (e) => activeDrag?.onMove(e));
  addEventListener("mouseup", () => {
    activeDrag?.onEnd();
    activeDrag = null;
  });
  const attr = document.documentElement.getAttribute("data-theme");
  const isDark =
    attr === "dark" ||
    (!attr && matchMedia("(prefers-color-scheme: dark)").matches);
  mermaid.initialize({
    startOnLoad: false,
    theme: "base",
    look: "classic",
    themeVariables: {
      fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      fontSize: "15px",
      primaryColor: isDark ? "#3a2a22" : "#fbe7dc",
      primaryBorderColor: isDark ? "#f0743f" : "#c2410c",
      primaryTextColor: isDark ? "#f0e8dc" : "#2c2a25",
      secondaryColor: isDark ? "#243a1a" : "#ecf5dc",
      secondaryBorderColor: isDark ? "#a3e635" : "#4d7c0f",
      secondaryTextColor: isDark ? "#f0e8dc" : "#2c2a25",
      tertiaryColor: isDark ? "#1c3532" : "#dcf2ef",
      tertiaryBorderColor: isDark ? "#5eead4" : "#0f766e",
      tertiaryTextColor: isDark ? "#f0e8dc" : "#2c2a25",
      lineColor: isDark ? "#a89e90" : "#7c756a",
      noteBkgColor: isDark ? "#342e29" : "#fffdf7",
      noteTextColor: isDark ? "#f0e8dc" : "#2c2a25",
      noteBorderColor: isDark ? "#fbbf24" : "#b45309",
      actorBkg: isDark ? "#3a2a22" : "#fbe7dc",
      actorBorder: isDark ? "#f0743f" : "#c2410c",
      actorTextColor: isDark ? "#f0e8dc" : "#2c2a25",
      signalColor: isDark ? "#a89e90" : "#7c756a",
      signalTextColor: isDark ? "#f0e8dc" : "#2c2a25",
    },
  });
  function initDiagram(shell) {
    const wrap = shell.querySelector(".mermaid-wrap"),
      viewport = shell.querySelector(".mermaid-viewport"),
      canvas = shell.querySelector(".mermaid-canvas"),
      source = shell.querySelector(".diagram-source"),
      label = shell.querySelector(".zoom-label");
    if (!wrap || !viewport || !canvas || !source || !label) return;
    let zoom = 1,
      fitMode = "contain",
      panX = 0,
      panY = 0,
      svgW = 0,
      svgH = 0,
      sx = 0,
      sy = 0,
      spx = 0,
      spy = 0,
      touchDist = 0,
      touchCx = 0,
      touchCy = 0;
    function constrainPan() {
      const vpW = viewport.clientWidth,
        vpH = viewport.clientHeight,
        rW = svgW * zoom,
        rH = svgH * zoom,
        pad = config.fitPadding;
      panX =
        rW + pad * 2 <= vpW ? (vpW - rW) / 2 : clamp(panX, vpW - rW - pad, pad);
      panY =
        rH + pad * 2 <= vpH ? (vpH - rH) / 2 : clamp(panY, vpH - rH - pad, pad);
    }
    function applyTransform() {
      const svg = canvas.querySelector("svg");
      if (!svg || !svgW) return;
      constrainPan();
      svg.style.width = svgW * zoom + "px";
      svg.style.height = svgH * zoom + "px";
      canvas.style.transform = `translate(${panX}px, ${panY}px)`;
      label.textContent = Math.round(zoom * 100) + "% — " + fitMode;
    }
    function canPan() {
      return (
        svgW * zoom + config.fitPadding * 2 > viewport.clientWidth ||
        svgH * zoom + config.fitPadding * 2 > viewport.clientHeight
      );
    }
    function computeSmartFit() {
      const vpW = viewport.clientWidth,
        vpH = viewport.clientHeight,
        aW = Math.max(80, vpW - config.fitPadding * 2),
        aH = Math.max(80, vpH - config.fitPadding * 2),
        contain = Math.min(aW / svgW, aH / svgH);
      let z = contain,
        mode = "contain";
      if (contain < config.readabilityFloor) {
        const chartR = svgH / svgW,
          vpR = vpH / Math.max(vpW, 1);
        if (chartR >= vpR) {
          z = aW / svgW;
          mode = "width-priority";
        } else {
          z = aH / svgH;
          mode = "height-priority";
        }
      }
      return {
        zoom: clamp(z, config.minZoom, config.maxInitialZoom),
        mode,
      };
    }
    function fitDiagram() {
      if (!svgW) return;
      const fit = computeSmartFit();
      zoom = fit.zoom;
      fitMode = fit.mode;
      panX = (viewport.clientWidth - svgW * zoom) / 2;
      panY = (viewport.clientHeight - svgH * zoom) / 2;
      applyTransform();
    }
    function setOneToOne() {
      zoom = clamp(1, config.minZoom, config.maxZoom);
      fitMode = "1:1";
      panX = (viewport.clientWidth - svgW * zoom) / 2;
      panY = (viewport.clientHeight - svgH * zoom) / 2;
      applyTransform();
    }
    function zoomAround(factor, cx, cy) {
      const next = clamp(zoom * factor, config.minZoom, config.maxZoom),
        ratio = next / zoom;
      panX = cx - ratio * (cx - panX);
      panY = cy - ratio * (cy - panY);
      zoom = next;
      fitMode = "custom";
      applyTransform();
    }
    function readSvgNaturalSize(svg) {
      let w = 0,
        h = 0;
      if (svg.viewBox?.baseVal?.width > 0) {
        w = svg.viewBox.baseVal.width;
        h = svg.viewBox.baseVal.height;
      }
      if (!w) {
        w = parseFloat(svg.getAttribute("width")) || 0;
        h = parseFloat(svg.getAttribute("height")) || 0;
      }
      if (!w) {
        const b = svg.getBBox();
        w = b.width;
        h = b.height;
      }
      if (!w) {
        const r = svg.getBoundingClientRect();
        w = r.width || 1000;
        h = r.height || 700;
      }
      if (!svg.getAttribute("viewBox"))
        svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
      return { w, h };
    }
    function setAdaptiveHeight() {
      if (!svgW) return;
      const usableW = Math.max(280, wrap.getBoundingClientRect().width - 2),
        idealH = (svgH / svgW) * usableW + config.fitPadding * 2,
        maxVp = Math.floor(innerHeight * config.maxHeightVh),
        hardMax = Math.min(
          config.maxHeightPx,
          Math.max(config.minHeight + 40, maxVp),
        );
      wrap.style.height =
        Math.round(clamp(idealH, config.minHeight, hardMax)) + "px";
    }
    function openInNewTab() {
      const svg = canvas.querySelector("svg");
      if (!svg) return;
      const clone = svg.cloneNode(true);
      clone.style.width = "";
      clone.style.height = "";
      const bg = isDark ? "#1c1916" : "#faf6f0";
      const html = `<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Diagram</title><style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:${bg};padding:40px;box-sizing:border-box}svg{max-width:100%;max-height:90vh;height:auto}</style></head><body>${clone.outerHTML}</body></html>`;
      open(
        URL.createObjectURL(new Blob([html], { type: "text/html" })),
        "_blank",
      );
    }
    async function render() {
      try {
        const code = source.textContent.trim();
        if (!code) {
          label.textContent = "Lỗi: nguồn rỗng";
          return;
        }
        const id =
          "diagram-" +
          Date.now() +
          "-" +
          Math.random().toString(36).slice(2, 8);
        const { svg } = await mermaid.render(id, code);
        canvas.innerHTML = svg;
        const svgNode = canvas.querySelector("svg");
        if (!svgNode) {
          label.textContent = "Lỗi: không có SVG";
          return;
        }
        const size = readSvgNaturalSize(svgNode);
        svgW = size.w;
        svgH = size.h;
        svgNode.removeAttribute("width");
        svgNode.removeAttribute("height");
        svgNode.style.maxWidth = "none";
        svgNode.style.display = "block";
        setAdaptiveHeight();
        fitDiagram();
      } catch (err) {
        console.error("Mermaid render failed:", err);
        label.textContent = "Lỗi: " + (err.message || "render thất bại");
      }
    }
    const actions = {
      "zoom-in": () =>
        zoomAround(
          1 + config.zoomStep,
          viewport.clientWidth / 2,
          viewport.clientHeight / 2,
        ),
      "zoom-out": () =>
        zoomAround(
          1 / (1 + config.zoomStep),
          viewport.clientWidth / 2,
          viewport.clientHeight / 2,
        ),
      "zoom-fit": fitDiagram,
      "zoom-one": setOneToOne,
      "zoom-expand": openInNewTab,
    };
    Object.entries(actions).forEach(([action, handler]) => {
      wrap
        .querySelector(`[data-action="${action}"]`)
        ?.addEventListener("click", handler);
    });
    viewport.addEventListener("dblclick", fitDiagram);
    viewport.addEventListener(
      "wheel",
      (e) => {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          const rect = viewport.getBoundingClientRect();
          zoomAround(
            e.deltaY < 0 ? 1 + config.zoomStep : 1 / (1 + config.zoomStep),
            e.clientX - rect.left,
            e.clientY - rect.top,
          );
          return;
        }
        if (canPan()) {
          e.preventDefault();
          panX -= e.deltaX;
          panY -= e.deltaY;
          applyTransform();
        }
      },
      { passive: false },
    );
    viewport.addEventListener("mousedown", (e) => {
      if (e.target.closest(".zoom-controls") || !canPan()) return;
      wrap.classList.add("is-panning");
      sx = e.clientX;
      sy = e.clientY;
      spx = panX;
      spy = panY;
      e.preventDefault();
      activeDrag = {
        onMove: (ev) => {
          panX = spx + (ev.clientX - sx);
          panY = spy + (ev.clientY - sy);
          applyTransform();
        },
        onEnd: () => wrap.classList.remove("is-panning"),
      };
    });
    viewport.addEventListener(
      "touchstart",
      (e) => {
        if (e.touches.length === 1) {
          sx = e.touches[0].clientX;
          sy = e.touches[0].clientY;
          spx = panX;
          spy = panY;
        } else if (e.touches.length === 2) {
          const dx = e.touches[0].clientX - e.touches[1].clientX,
            dy = e.touches[0].clientY - e.touches[1].clientY;
          touchDist = Math.sqrt(dx * dx + dy * dy);
          const r = viewport.getBoundingClientRect();
          touchCx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - r.left;
          touchCy = (e.touches[0].clientY + e.touches[1].clientY) / 2 - r.top;
        }
      },
      { passive: true },
    );
    viewport.addEventListener(
      "touchmove",
      (e) => {
        if (e.touches.length === 1 && canPan()) {
          if (touchDist > 0) {
            sx = e.touches[0].clientX;
            sy = e.touches[0].clientY;
            spx = panX;
            spy = panY;
            touchDist = 0;
          }
          e.preventDefault();
          panX = spx + (e.touches[0].clientX - sx);
          panY = spy + (e.touches[0].clientY - sy);
          applyTransform();
        } else if (e.touches.length === 2 && touchDist > 0) {
          e.preventDefault();
          const dx = e.touches[0].clientX - e.touches[1].clientX,
            dy = e.touches[0].clientY - e.touches[1].clientY,
            d = Math.sqrt(dx * dx + dy * dy);
          zoomAround(d / touchDist, touchCx, touchCy);
          touchDist = d;
        }
      },
      { passive: false },
    );
    new ResizeObserver(() => {
      if (svgW) {
        setAdaptiveHeight();
        fitDiagram();
      }
    }).observe(wrap);
    render();
  }
  document.querySelectorAll(".diagram-shell").forEach(initDiagram);
}
