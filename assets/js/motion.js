export function setupMotion() {
  const root = document.documentElement;
  const main = document.querySelector("main");
  const header = document.querySelector("body > header");
  const preference = matchMedia("(prefers-reduced-motion: reduce)");
  const compact = matchMedia("(max-width: 767px)");
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)");
  const toggle = document.getElementById("motion-toggle");
  let userReduced = false;
  try {
    userReduced = localStorage.getItem("lokanaik.motion.v1") === "reduced";
  } catch {}
  let reduced = false,
    frame = 0,
    lastTime = 0,
    dirty = true,
    destination = null;
  const active = new Map(),
    seen = new WeakSet(),
    pending = new Set(),
    visible = new Set();
  document
    .querySelectorAll(".story-card,[data-module-card]")
    .forEach((card) => {
      card.dataset.tilt = "";
      card.dataset.depth = "";
    });
  const layers = [...document.querySelectorAll("[data-parallax]")].map(
    (node) => ({
      node,
      bounds: node,
      depth: Number(node.dataset.parallax) || 0,
      top: 0,
      height: 1,
      offset: 0,
      visible: false,
      media: false,
    }),
  );
  document
    .querySelectorAll(".story-card img,[data-module-card] img")
    .forEach((node) => {
      node.dataset.scrollMedia = "";
      layers.push({
        node,
        bounds: node.parentElement,
        depth: 24,
        top: 0,
        height: 1,
        offset: 0,
        visible: false,
        media: true,
      });
    });
  const tilts = [...document.querySelectorAll("[data-tilt]")].map((node) => ({
    node,
    x: 0,
    y: 0,
    toX: 0,
    toY: 0,
  }));
  function cancel(node) {
    active.get(node)?.cancel();
    active.delete(node);
    node.removeAttribute("data-revealing");
  }
  function clearMotion() {
    for (const node of active.keys()) cancel(node);
    cancelAnimationFrame(frame);
    frame = 0;
    lastTime = 0;
    for (const layer of layers) {
      layer.offset = 0;
      layer.node.style.removeProperty("--media-y");
      layer.node.style.translate = "";
    }
    for (const tilt of tilts) {
      tilt.x = tilt.y = tilt.toX = tilt.toY = 0;
      tilt.node.style.transform = "";
    }
  }
  function schedule() {
    if (!frame && !document.hidden) frame = requestAnimationFrame(tick);
  }
  function measure() {
    const y = window.scrollY;
    for (const layer of layers) {
      const rect = layer.bounds.getBoundingClientRect();
      layer.top = rect.top + y - (layer.media ? 0 : layer.offset);
      layer.height = rect.height;
    }
    dirty = false;
  }
  function tick(time) {
    frame = 0;
    const dt = Math.min(50, lastTime ? time - lastTime : 16.67);
    lastTime = time;
    header?.classList.toggle("is-scrolled", window.scrollY > 18);
    if (reduced || document.hidden) {
      lastTime = 0;
      return;
    }
    if (dirty) measure();
    const blend = 1 - Math.exp(-dt / 100);
    let moving = false;
    if (!compact.matches)
      for (const layer of layers) {
        if (!layer.visible) continue;
        const progress = Math.max(
          -1,
          Math.min(
            1,
            (window.scrollY + innerHeight / 2 - layer.top - layer.height / 2) /
              ((innerHeight + layer.height) / 2),
          ),
        );
        const target = (progress * layer.depth) / 2;
        layer.offset += (target - layer.offset) * blend;
        if (Math.abs(target - layer.offset) > 0.05) moving = true;
        if (layer.media)
          layer.node.style.setProperty(
            "--media-y",
            `${layer.offset.toFixed(2)}px`,
          );
        else layer.node.style.translate = `0 ${layer.offset.toFixed(2)}px`;
      }
    for (const tilt of tilts) {
      if (!tilt.x && !tilt.y && !tilt.toX && !tilt.toY) continue;
      tilt.x += (tilt.toX - tilt.x) * blend;
      tilt.y += (tilt.toY - tilt.y) * blend;
      if (Math.abs(tilt.x - tilt.toX) + Math.abs(tilt.y - tilt.toY) > 0.008)
        moving = true;
      else {
        tilt.x = tilt.toX;
        tilt.y = tilt.toY;
      }
      tilt.node.style.transform =
        tilt.x || tilt.y
          ? `perspective(1200px) rotateX(${tilt.x.toFixed(3)}deg) rotateY(${tilt.y.toFixed(3)}deg)`
          : "";
    }
    if (moving) schedule();
    else lastTime = 0;
  }
  for (const tilt of tilts) {
    tilt.node.addEventListener(
      "pointermove",
      (event) => {
        if (
          reduced ||
          compact.matches ||
          !finePointer.matches ||
          event.pointerType !== "mouse" ||
          root.dataset.scrollRunning
        )
          return;
        const rect = tilt.node.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        tilt.toX = Math.max(
          -2.2,
          Math.min(
            2.2,
            (-(event.clientY - rect.top - rect.height / 2) / rect.height) * 4.4,
          ),
        );
        tilt.toY = Math.max(
          -2.2,
          Math.min(
            2.2,
            ((event.clientX - rect.left - rect.width / 2) / rect.width) * 4.4,
          ),
        );
        schedule();
      },
      { passive: true },
    );
    for (const name of ["pointerleave", "pointercancel", "focusout"])
      tilt.node.addEventListener(name, () => {
        tilt.toX = tilt.toY = 0;
        schedule();
      });
  }
  function applyPreference() {
    reduced = preference.matches || userReduced;
    root.dataset.motion = reduced ? "reduced" : "full";
    if (toggle) {
      toggle.setAttribute("aria-pressed", String(reduced));
      const label = preference.matches
        ? "Gerakan dikurangi mengikuti pengaturan perangkat"
        : reduced
          ? "Aktifkan animasi"
          : "Kurangi animasi";
      toggle.title = label;
      toggle.setAttribute("aria-label", label);
      toggle.querySelector(".motion-label").textContent = reduced
        ? "Animasi ringan"
        : "Animasi aktif";
      toggle.querySelector(".material-symbols-outlined").textContent = reduced
        ? "motion_photos_off"
        : "motion_photos_on";
    }
    if (reduced) clearMotion();
    else {
      dirty = true;
      schedule();
    }
    window.dispatchEvent(
      new CustomEvent("loka:motionchange", { detail: { reduced } }),
    );
  }
  toggle?.addEventListener("click", () => {
    if (preference.matches) return;
    userReduced = !userReduced;
    try {
      localStorage.setItem(
        "lokanaik.motion.v1",
        userReduced ? "reduced" : "full",
      );
    } catch {}
    applyPreference();
  });
  preference.addEventListener("change", applyPreference);
  compact.addEventListener("change", () => {
    clearMotion();
    dirty = true;
    schedule();
  });
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener(
    "resize",
    () => {
      dirty = true;
      schedule();
    },
    { passive: true },
  );
  window.addEventListener("loka:navigate", () => {
    dirty = true;
    schedule();
  });
  main?.addEventListener(
    "load",
    () => {
      dirty = true;
      schedule();
    },
    true,
  );
  document.fonts?.ready.then(() => {
    dirty = true;
    schedule();
  });
  applyPreference();
  if (
    !main ||
    !("IntersectionObserver" in window) ||
    !Element.prototype.animate
  )
    return;
  const layerObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries)
        for (const layer of layers)
          if (layer.bounds === entry.target)
            layer.visible = entry.isIntersecting;
      dirty = true;
      schedule();
    },
    { rootMargin: "80px" },
  );
  layers.forEach((layer) => layerObserver.observe(layer.bounds));
  const selector =
    '.story-card,[data-module-card],[data-tilt],.module-switcher,[data-lesson-stages] > a,fieldset,details,h1,h2,h3,h4,p,ul,ol,img[alt]:not([alt=""]),a.loka-btn,button.loka-btn,a.inline-flex';
  function reveal(node, index = 0) {
    if (
      seen.has(node) ||
      !node.isConnected ||
      node.closest("[hidden],details:not([open]) > :not(summary)") ||
      document.hidden
    )
      return;
    if (destination && !destination.contains(node)) return;
    if (reduced || node.contains(document.activeElement)) {
      seen.add(node);
      return;
    }
    const opacity = getComputedStyle(node).opacity;
    if (opacity === "0") return;
    const photo = node.matches(
      "img,.story-card,[data-module-card],[data-tilt]",
    );
    const heading = node.matches("h1,h2,h3");
    const start = { opacity: 0 },
      end = { opacity: opacity || "1" };
    if (window.CSS?.supports?.("translate", "0 1px")) {
      start.translate = `0 ${compact.matches ? 16 : photo ? 36 : heading ? 28 : 20}px`;
      end.translate = "0 0";
      if (photo) {
        start.scale = compact.matches ? ".99" : ".975";
        end.scale = "1";
      }
    }
    seen.add(node);
    node.setAttribute("data-revealing", "");
    const animation = node.animate([start, end], {
      duration: compact.matches ? 720 : photo ? 1100 : 900,
      delay: Math.min(index, 3) * (compact.matches ? 45 : 65),
      easing: "cubic-bezier(.16,1,.3,1)",
      fill: "backwards",
    });
    active.set(node, animation);
    animation.finished.then(
      () => {
        if (active.get(node) === animation) {
          active.delete(node);
          node.removeAttribute("data-revealing");
        }
      },
      () => {},
    );
  }
  const observer = new IntersectionObserver(
    (entries) => {
      const entering = [];
      for (const entry of entries) {
        if (entry.isIntersecting) {
          visible.add(entry.target);
          entering.push(entry);
        } else {
          visible.delete(entry.target);
          seen.delete(entry.target);
          cancel(entry.target);
        }
      }
      entering
        .sort(
          (a, b) =>
            a.boundingClientRect.top - b.boundingClientRect.top ||
            a.boundingClientRect.left - b.boundingClientRect.left,
        )
        .forEach((entry, index) => reveal(entry.target, index));
    },
    { threshold: 0, rootMargin: "0px 0px 32px 0px" },
  );
  function register(scope) {
    const nodes = [
      ...(scope.matches?.(selector) ? [scope] : []),
      ...scope.querySelectorAll(selector),
    ];
    for (const node of nodes) {
      if (
        pending.has(node) ||
        node.closest(
          'dialog,[aria-live],[role="status"],[aria-hidden="true"],.absolute,.pointer-events-none,.search-suggestions,.search-result',
        )
      )
        continue;
      if (node.parentElement?.closest("[data-reveal]")) continue;
      node.setAttribute("data-reveal", "");
      pending.add(node);
      observer.observe(node);
    }
  }
  function flushVisible() {
    const entries = [...pending]
      .filter((node) => {
        const rect = node.getBoundingClientRect();
        return rect.width > 0 && rect.bottom > 0 && rect.top < innerHeight;
      })
      .sort(
        (a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top,
      );
    entries.forEach(reveal);
  }
  register(main);
  new MutationObserver((records) => {
    for (const node of pending)
      if (!node.isConnected) {
        pending.delete(node);
        visible.delete(node);
        observer.unobserve(node);
        cancel(node);
      }
    for (const record of records)
      for (const node of record.addedNodes)
        if (node.nodeType === 1) register(node);
  }).observe(main, { childList: true, subtree: true });
  window.addEventListener("loka:scrollstart", (event) => {
    destination = event.detail.target.closest("main > section");
    for (const node of active.keys()) cancel(node);
    for (const tilt of tilts) tilt.toX = tilt.toY = 0;
    schedule();
  });
  window.addEventListener("loka:scrollend", () => {
    destination = null;
    flushVisible();
  });
  document.addEventListener("focusin", (event) => {
    for (const node of active.keys())
      if (node.contains(event.target)) cancel(node);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) clearMotion();
    else {
      dirty = true;
      schedule();
      flushVisible();
    }
  });
  window.addEventListener("pagehide", clearMotion);
  window.addEventListener("pageshow", () => {
    dirty = true;
    schedule();
  });
  window.addEventListener("beforeprint", clearMotion);
}
