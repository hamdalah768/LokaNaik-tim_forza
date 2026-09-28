import { currentURL, writeHistory } from "./utils.js?v=20260923r";
import { searchItems, lessons } from "./content.js?v=20260923";
import { ui, element } from "./utils.js?v=20260923";
export const normalize = (value) =>
  String(value)
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("id")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
const destinations = [
  {
    id: "section-belajar",
    type: "materi",
    title: "Materi belajar",
    description: "Pilih modul dan lanjutkan progres belajarmu.",
    keywords: "belajar materi material materials modul pelajaran learning",
    url: "#belajar",
  },
  {
    id: "section-home",
    type: "halaman",
    title: "Beranda LokaNaik",
    description: "Ruang belajar untuk usaha lokal.",
    keywords: "utama home navigasi awal",
    url: "#beranda",
  },
  {
    id: "section-cerita",
    type: "cerita",
    title: "Cerita produk lokal",
    description: "Kain, kemasan, keramik, dan anyaman.",
    keywords: "kisah cerita stories produk",
    url: "#cerita",
  },
  {
    id: "section-kontak",
    type: "halaman",
    title: "Kontak dan lokasi",
    description: "Temukan kanal komunikasi dan lokasi.",
    keywords: "alamat email telepon whatsapp instagram maps kontak informasi",
    url: "#informasi",
  },
  {
    id: "section-sumber",
    type: "halaman",
    title: "Sumber dan referensi",
    description: "Kredit foto, lisensi, serta bacaan resmi.",
    keywords: "foto gambar lisensi dokumen sumber referensi credits",
    url: "#sumber",
  },
  {
    id: "section-akun",
    type: "halaman",
    title: "Akun",
    description: "Buka pilihan masuk atau daftar.",
    keywords: "login masuk daftar register sign in account",
    url: "#akun",
  },
];
const references = lessons
  .flatMap((lesson) =>
    (lesson.sources || []).map((source, i) => ({
      id: `ref-${lesson.slug}-${i}`,
      type: "materi",
      title: source.title,
      description: `Bacaan resmi untuk ${lesson.name}.`,
      keywords: `sumber referensi dokumen ${lesson.name} ${source.organization || ""}`,
      url: source.url,
      external: true,
    })),
  )
  .filter((item) => item.title && item.url);
export const searchIndex = [
  ...searchItems.map((item) => ({
    ...item,
    keywords: `${item.keywords} ${item.type === "materi" ? "materi belajar modul" : item.type === "cerita" ? "cerita kisah" : "alat tools"}`,
  })),
  ...destinations,
  ...references,
];
function distance(a, b, limit) {
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i),
    before;
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let minimum = i;
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(
        row[j - 1] + 1,
        prev[j] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      if (
        before &&
        i > 1 &&
        j > 1 &&
        a[i - 1] === b[j - 2] &&
        a[i - 2] === b[j - 1]
      )
        row[j] = Math.min(row[j], before[j - 2] + 1);
      minimum = Math.min(minimum, row[j]);
    }
    if (minimum > limit) return limit + 1;
    before = prev;
    prev = row;
  }
  return prev[b.length];
}
const documents = searchIndex.map((item) => ({
  ...item,
  titleNorm: normalize(item.title),
  descriptionNorm: normalize(item.description),
  keywordsNorm: normalize(item.keywords),
}));
export function search(query, type = "all") {
  const q = normalize(query).slice(0, 200);
  const words = q.split(" ").filter(Boolean);
  if (!q)
    return searchItems.filter((item) => type === "all" || item.type === type);
  return documents
    .filter((item) => type === "all" || item.type === type)
    .map((item) => {
      let score =
        item.titleNorm === q
          ? 1000
          : item.titleNorm.startsWith(q)
            ? 850
            : item.titleNorm.includes(q)
              ? 700
              : 0;
      for (const word of words) {
        if (item.titleNorm.split(" ").some((token) => token.startsWith(word)))
          score += 110;
        else if (item.titleNorm.includes(word)) score += 90;
        else if (item.keywordsNorm.includes(word)) score += 55;
        else if (item.descriptionNorm.includes(word)) score += 30;
        else {
          const limit = word.length >= 7 ? 2 : word.length >= 3 ? 1 : 0;
          const tokens = new Set(
            `${item.titleNorm} ${item.keywordsNorm} ${item.descriptionNorm}`.split(
              " ",
            ),
          );
          if (
            !limit ||
            ![...tokens].some((token) => distance(word, token, limit) <= limit)
          )
            return null;
          score += 8;
        }
      }
      return { item, score };
    })
    .filter(Boolean)
    .sort(
      (a, b) =>
        b.score - a.score || a.item.title.localeCompare(b.item.title, "id"),
    )
    .map((hit) => hit.item);
}
export function setupSearch() {
  const root = document.getElementById("pencarian");
  if (!root) return;
  const input = ui(root, "searchInput"),
    form = input.closest("form"),
    container = ui(root, "resultsContainer");
  const popup = document.getElementById("search-suggestions");
  const rows = new Map(
    [...container.querySelectorAll("[data-result-id]")].map((row) => [
      row.dataset.resultId,
      row,
    ]),
  );
  const tabs = [...root.querySelectorAll("[data-filter]")],
    track = document.getElementById("filter-track"),
    indicator = document.getElementById("filter-indicator");
  const preference = matchMedia("(prefers-reduced-motion: reduce)");
  let type = "all",
    selected = -1,
    hits = [],
    dismissed = false,
    composition = false,
    animationFrame = 0;
  function closeSuggestions() {
    dismissed = true;
    selected = -1;
    popup.hidden = true;
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
  }
  function select(index) {
    const options = [...popup.querySelectorAll("[role=option]")];
    if (!options.length) return;
    selected = (index + options.length) % options.length;
    options.forEach((option, i) =>
      option.setAttribute("aria-selected", String(i === selected)),
    );
    input.setAttribute("aria-activedescendant", options[selected].id);
    options[selected].scrollIntoView({ block: "nearest" });
  }
  function positionIndicator() {
    const active = tabs.find((button) => button.dataset.filter === type);
    if (!active || !indicator) return;
    const rect = active.getBoundingClientRect(),
      base = track.getBoundingClientRect();
    indicator.style.width = rect.width + "px";
    indicator.style.height = rect.height + "px";
    indicator.style.transform = `translate(${rect.left - base.left + track.scrollLeft}px,${rect.top - base.top + track.scrollTop}px)`;
  }
  function buildRow(item) {
    const row = element("article", "", "result-row search-result");
    row.dataset.resultId = item.id;
    const icon = element(
      "span",
      item.external
        ? "open_in_new"
        : item.type === "cerita"
          ? "auto_stories"
          : "explore",
      "material-symbols-outlined result-symbol",
    );
    icon.setAttribute("aria-hidden", "true");
    const body = element("div"),
      heading = element("h3"),
      link = element("a", item.title),
      description = element("p", item.description);
    link.href = item.url;
    if (item.external) {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    }
    heading.append(link);
    body.append(heading, description);
    row.append(icon, body);
    rows.set(item.id, row);
    return row;
  }
  function suggestions() {
    const visible =
      !dismissed && !!input.value.trim() && document.activeElement === input;
    popup.hidden = !visible;
    input.setAttribute("aria-expanded", String(visible));
    popup.replaceChildren();
    selected = -1;
    input.removeAttribute("aria-activedescendant");
    if (!visible) return;
    for (const [index, item] of hits.slice(0, 7).entries()) {
      const option = element("li");
      option.id = "search-option-" + index;
      option.setAttribute("role", "option");
      option.setAttribute("aria-selected", "false");
      option.dataset.index = index;
      const label = element("span", item.title, "suggestion-title"),
        detail = element(
          "small",
          `${item.external ? "Sumber resmi" : item.type} · ${item.description}`,
        );
      option.append(label, detail);
      popup.append(option);
    }
    if (!hits.length) {
      const empty = element(
        "li",
        "Tidak ada konten yang cocok. Coba foto, katalog, atau keamanan.",
        "suggestion-empty",
      );
      empty.setAttribute("role", "presentation");
      popup.append(empty);
    }
  }
  function render(animate = false) {
    hits = search(input.value, type);
    const ids = new Set(hits.map((item) => item.id));
    for (const row of rows.values())
      row.hidden = !ids.has(row.dataset.resultId);
    hits.forEach((item, index) => {
      const row = rows.get(item.id) || buildRow(item);
      row.hidden = false;
      container.append(row);
      if (
        animate &&
        !preference.matches &&
        document.documentElement.dataset.motion !== "reduced" &&
        row.animate
      ) {
        row.getAnimations?.().forEach((a) => a.cancel());
        row.animate(
          [
            { opacity: 0.25, translate: "0 12px", scale: ".985" },
            { opacity: 1, translate: "0 0", scale: "1" },
          ],
          {
            duration: 340,
            delay: Math.min(index, 5) * 30,
            easing: "cubic-bezier(.22,1,.36,1)",
          },
        );
      }
    });
    ui(root, "resultsCountLabel").textContent =
      `${hits.length} hasil ditemukan`;
    ui(root, "emptyState").hidden = hits.length !== 0;
    ui(root, "clearBtn").disabled = !input.value;
    tabs.forEach((button) => {
      const active = button.dataset.filter === type;
      button.setAttribute("aria-pressed", String(active));
      button.classList.toggle("active-filter", active);
      const label = {
        all: "Semua",
        materi: "Materi",
        cerita: "Cerita",
        alat: "Alat",
      }[button.dataset.filter];
      button.textContent = `${label} (${search(input.value, button.dataset.filter).length})`;
    });
    cancelAnimationFrame(animationFrame);
    animationFrame = requestAnimationFrame(positionIndicator);
    suggestions();
  }
  function updateURL(push = false) {
    const url = currentURL(),
      query = input.value.trim().slice(0, 200);
    query ? url.searchParams.set("q", query) : url.searchParams.delete("q");
    type === "all"
      ? url.searchParams.delete("type")
      : url.searchParams.set("type", type);
    if (url.href !== currentURL().href)
      writeHistory(push ? "push" : "replace", {}, "", url);
  }
  function restore() {
    const p = currentURL().searchParams;
    input.value = (p.get("q") || "").slice(0, 200);
    type = ["all", "materi", "cerita", "alat"].includes(p.get("type"))
      ? p.get("type")
      : "all";
    closeSuggestions();
    render();
  }
  function activate(index) {
    const item = hits[index];
    if (!item) return;
    closeSuggestions();
    const link = rows.get(item.id)?.querySelector("a");
    if (link) link.click();
  }
  input.addEventListener("compositionstart", () => (composition = true));
  input.addEventListener("compositionend", () => {
    composition = false;
    dismissed = false;
    render();
  });
  input.addEventListener("input", () => {
    if (composition) return;
    dismissed = false;
    render();
  });
  input.addEventListener("focus", () => {
    dismissed = false;
    suggestions();
  });
  input.addEventListener("keydown", (event) => {
    if (composition || event.isComposing) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeSuggestions();
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (popup.hidden) {
        dismissed = false;
        suggestions();
      }
      select(
        selected < 0
          ? event.key === "ArrowDown"
            ? 0
            : -1
          : selected + (event.key === "ArrowDown" ? 1 : -1),
      );
    }
    if (event.key === "Enter" && selected >= 0 && !popup.hidden) {
      event.preventDefault();
      activate(selected);
    }
  });
  popup.addEventListener("pointerdown", (event) => event.preventDefault());
  popup.addEventListener("click", (event) => {
    const option = event.target.closest("[data-index]");
    if (option) activate(Number(option.dataset.index));
  });
  document.addEventListener("pointerdown", (event) => {
    if (!form.contains(event.target)) closeSuggestions();
  });
  form.addEventListener("focusout", (event) => {
    if (!form.contains(event.relatedTarget)) closeSuggestions();
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    input.value = input.value.trim();
    updateURL(true);
    closeSuggestions();
    render();
  });
  tabs.forEach((button) =>
    button.addEventListener("click", () => {
      type = button.dataset.filter;
      closeSuggestions();
      updateURL(true);
      render(true);
    }),
  );
  root.querySelectorAll(".quick-chip").forEach((button) =>
    button.addEventListener("click", () => {
      input.value = button.textContent.trim();
      type = "all";
      dismissed = false;
      input.focus({ preventScroll: true });
      updateURL(true);
      render(true);
    }),
  );
  for (const id of ["clearBtn", "clearKeywordFromEmpty"])
    ui(root, id).addEventListener("click", () => {
      input.value = "";
      closeSuggestions();
      updateURL(true);
      render();
      input.focus({ preventScroll: true });
    });
  ui(root, "resetFilterBtn").addEventListener("click", () => {
    type = "all";
    updateURL(true);
    render(true);
  });
  ui(root, "resetFromEmpty").addEventListener("click", () => {
    input.value = "";
    type = "all";
    closeSuggestions();
    updateURL(true);
    render(true);
  });
  if ("ResizeObserver" in window)
    new ResizeObserver(positionIndicator).observe(track);
  document.fonts?.ready.then(positionIndicator);
  window.addEventListener("resize", positionIndicator, { passive: true });
  window.addEventListener("loka:navigate", restore);
  restore();
}
