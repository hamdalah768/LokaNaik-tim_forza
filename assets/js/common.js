import { currentURL } from "./utils.js?v=20260923r";
import {
  ui,
  element,
  setupDialog,
  dialog,
  scrollToElement,
  shareWhatsApp,
} from "./utils.js?v=20260923";
export function setupCommon() {
  setupDialog();
  const header = document.querySelector("body > header");
  if (header) {
    const measure = () =>
      document.documentElement.style.setProperty(
        "--header-height",
        Math.ceil(header.getBoundingClientRect().height) + "px",
      );
    if ("ResizeObserver" in window) new ResizeObserver(measure).observe(header);
    window.addEventListener("resize", measure, { passive: true });
    measure();
  }
  // A panel taller than the viewport must scroll with the document.
  // Otherwise its lower fields remain outside the viewport while the panel sticks.
  const stickyPanels = [...document.querySelectorAll("main .sticky")];
  const fitStickyPanels = () => {
    const headerHeight = header?.getBoundingClientRect().height || 0;
    stickyPanels.forEach((panel) => {
      const fits =
        panel.getBoundingClientRect().height + headerHeight + 36 <=
        window.innerHeight;
      panel.classList.toggle("sticky-too-tall", !fits);
    });
  };
  if ("ResizeObserver" in window) {
    const observer = new ResizeObserver(fitStickyPanels);
    stickyPanels.forEach((panel) => observer.observe(panel));
    if (header) observer.observe(header);
  }
  window.addEventListener("resize", fitStickyPanels, { passive: true });
  window.addEventListener("pageshow", fitStickyPanels);
  fitStickyPanels();
  document.addEventListener("keydown", (event) => {
    if (
      !(event.ctrlKey || event.metaKey) ||
      event.key.toLowerCase() !== "k" ||
      document.querySelector("dialog[open]")
    )
      return;
    event.preventDefault();
    const input = ui(document, "searchInput");
    if (input) {
      scrollToElement(input, "center");
      input.focus({ preventScroll: true });
    } else location.assign("#pencarian");
  });
  document.querySelectorAll("[data-action=faq]").forEach((button) => {
    const answer = document.getElementById(
      button.getAttribute("aria-controls"),
    );
    answer.hidden = true;
    button.setAttribute("aria-expanded", "false");
    button.addEventListener("click", () => {
      answer.hidden = !answer.hidden;
      button.setAttribute("aria-expanded", String(!answer.hidden));
      const icon = button.querySelector(
        ".material-symbols-outlined:last-child",
      );
      if (icon)
        icon.textContent = answer.hidden ? "expand_more" : "expand_less";
    });
  });
  document.querySelectorAll("[data-privacy]").forEach((button) =>
    button.addEventListener("click", (event) => {
      event.preventDefault();
      const body = element("div");
      for (const text of [
        "Materi dan Studio dapat digunakan tanpa akun. Progres modul disimpan pada perangkat ini. Rancangan katalog hanya disimpan ketika kamu memilih Simpan di perangkat.",
        "Foto diproses langsung di browser. LokaNaik tidak mengunggah foto, sandi, nomor ponsel, atau kode verifikasi. Layanan akun belum diaktifkan; formulir tidak menerima data masuk.",
        "Menghapus data situs pada browser dapat menghapus progres dan rancangan. Gunakan unduhan untuk menyimpan salinan katalog. Perangkat bersama dapat menampilkan data lokal yang masih tersimpan.",
        "Sumber bacaan, Maps, email, dan WhatsApp memakai layanan pihak ketiga ketika kamu memilih tautannya. Hosting dapat mencatat permintaan halaman sesuai kebijakan penyedianya.",
        "Hak foto dan logo mengikuti pemilik aset. Gunakan foto sendiri atau yang kamu punya izin pakainya. Sumber bacaan tersedia pada setiap modul dan cerita.",
      ])
        body.append(element("p", text, "mb-4"));
      const source = element(
        "a",
        "Lihat sumber foto dan referensi",
        "source-link",
      );
      source.href = "#sumber";
      source.addEventListener("click", () =>
        document.getElementById("loka-dialog").close(),
      );

      source.rel = "noopener noreferrer";
      body.append(source);
      dialog("Sumber & privasi", body);
    }),
  );
  // Resolve public metadata from the actual deployed address; no guessed domain is shipped.
  if (
    location.protocol === "https:" &&
    !/(^localhost$|\.local$|\.test$|\.invalid$)/.test(location.hostname)
  ) {
    const url = currentURL();
    url.hash = "";
    url.search = "";
    if (url.pathname.endsWith("/")) url.pathname += "index.html";
    if (!document.head.querySelector('link[rel="canonical"]')) {
      const canonical = element("link");
      canonical.rel = "canonical";
      canonical.href = url.href;
      document.head.append(canonical);
    }
    const image = new URL("assets/images/asset-12c8310caa33.jpg", url).href;
    for (const [property, content] of [
      ["og:url", url.href],
      ["og:image", image],
    ]) {
      if (document.head.querySelector(`meta[property="${property}"]`)) continue;
      const meta = element("meta");
      meta.setAttribute("property", property);
      meta.content = content;
      document.head.append(meta);
    }
    if (!document.head.querySelector('meta[name="twitter:image"]')) {
      const meta = element("meta");
      meta.name = "twitter:image";
      meta.content = image;
      document.head.append(meta);
    }
  }
}
export function setupHome() {
  const root = document.getElementById("beranda");
  for (const [inputName, outputName] of [
    ["input-prod-name", "preview-title"],
    ["input-prod-category", "preview-category"],
    ["input-prod-location", "preview-location"],
    ["input-prod-desc", "preview-desc"],
  ]) {
    const input = ui(root, inputName),
      output = ui(root, outputName);
    input.maxLength = inputName.endsWith("desc") ? 300 : 100;
    const update = () => {
      output.textContent = input.value;
    };
    input.addEventListener("input", update);
    update();
  }
  root
    .querySelector("[data-action=share-mini]")
    .addEventListener("click", () =>
      shareWhatsApp(
        [
          "input-prod-name",
          "input-prod-category",
          "input-prod-location",
          "input-prod-desc",
        ]
          .map((name) => ui(root, name).value)
          .join("\n"),
      ),
    );
}
