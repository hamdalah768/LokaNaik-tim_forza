import {
  currentURL,
  writeHistory,
  plainClick,
  scrollToElement,
} from "./utils.js?v=20260924";
import {
  scrollTarget,
  cancelScroll,
  rememberScroll,
  animateScroll,
} from "./scroll.js?v=20260924";
export const notifyNavigation = () =>
  window.dispatchEvent(new Event("loka:navigate"));
export function setupNavigation() {
  const header = document.querySelector("body > header");
  const sections = [...document.querySelectorAll("main > section[id]")];
  const links = [...header.querySelectorAll("a[data-section]")];
  const tracks = [...header.querySelectorAll(".nav-track")];
  let activeSection = "",
    frame = 0,
    storeTimer = 0,
    ticket = 0;
  let synchronizedURL = "";
  history.scrollRestoration = "manual";
  function sectionOf(node) {
    return node?.closest("main > section")?.id || "beranda";
  }
  function moveIndicators() {
    for (const track of tracks) {
      const pill = track.querySelector(".nav-indicator");
      const link = track.querySelector(`a[data-section="${activeSection}"]`);
      if (!pill) continue;
      if (!link || !track.getBoundingClientRect().width) {
        pill.hidden = true;
        continue;
      }
      pill.hidden = false;
      const rect = link.getBoundingClientRect(),
        base = track.getBoundingClientRect();
      pill.style.width = `${rect.width}px`;
      pill.style.height = `${rect.height}px`;
      pill.style.transform = `translate(${rect.left - base.left + track.scrollLeft}px,${rect.top - base.top + track.scrollTop}px)`;
    }
  }
  function highlight(id) {
    const next =
      id === "materi" ? "belajar" : id === "informasi" ? "pencarian" : id;
    if (next === activeSection) return;
    activeSection = next;
    for (const link of links) {
      const selected = link.dataset.section === next;
      link.classList.toggle("active-section", selected);
      if (selected) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    }
    moveIndicators();
  }
  function trackSection() {
    frame = 0;
    const target = scrollTarget();
    if (target) {
      highlight(sectionOf(target));
      return;
    }
    if (document.querySelector("dialog[open]")) return;
    const boundary = (header.getBoundingClientRect().height || 0) + 40;
    const visible = sections.filter(
      (section) =>
        !section.hidden && section.getBoundingClientRect().top <= boundary,
    );
    highlight(
      window.scrollY < 24 ? "beranda" : visible.at(-1)?.id || "beranda",
    );
  }
  function scheduleTrack() {
    if (!frame) frame = requestAnimationFrame(trackSection);
  }
  function targetFromHash() {
    let id;
    try {
      id = decodeURIComponent(currentURL().hash.slice(1));
    } catch {
      return null;
    }
    return document.getElementById(id || "beranda");
  }
  function followHash({ focus = false, immediate = false } = {}) {
    const target = targetFromHash();
    if (!target || target.closest("[hidden],dialog")) return;
    const details = target.closest("details");
    if (details) details.open = true;
    const ownTicket = ++ticket;
    highlight(sectionOf(target));
    scrollToElement(target, "start", { immediate }).then((completed) => {
      if (!completed || ownTicket !== ticket) return;
      highlight(sectionOf(target));
      if (focus && !document.querySelector("dialog[open]")) {
        const heading = target.matches("h1,h2,h3")
          ? target
          : target.querySelector("h1,h2,h3") || target;
        if (!heading.matches("a,button,input,select,textarea,summary"))
          heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
      }
    });
  }
  function synchronize() {
    notifyNavigation();
    synchronizedURL = currentURL().href;
  }
  document.addEventListener("click", (event) => {
    if (event.defaultPrevented || !plainClick(event)) return;
    const link = event.target.closest("a[href]");
    if (!link || link.target || link.hasAttribute("download")) return;
    const url = new URL(link.href);
    if (link.getAttribute("href").startsWith("#"))
      url.search = currentURL().search;
    if (
      url.origin !== location.origin ||
      url.pathname !== location.pathname ||
      !url.hash
    )
      return;
    let id;
    try {
      id = decodeURIComponent(url.hash.slice(1));
    } catch {
      return;
    }
    const target = document.getElementById(id);
    if (!target || target.closest("dialog")) return;
    event.preventDefault();
    if (url.href !== currentURL().href) writeHistory("push", {}, "", url);
    synchronize();
    followHash({ focus: true });
  });
  window.addEventListener("loka:navigate", () => {
    synchronizedURL = currentURL().href;
  });
  window.addEventListener("loka:historychange", () => {
    synchronizedURL = currentURL().href;
  });
  function restore() {
    if (currentURL().href === synchronizedURL) return;
    cancelScroll();
    const position = history.state?.lokaScrollY;
    synchronize();
    if (document.querySelector("dialog[open]")) return;
    if (Number.isFinite(position)) {
      animateScroll(document.getElementById("beranda"), "start", {
        top: position,
        immediate: true,
      });
      trackSection();
    } else followHash({ immediate: true });
  }
  window.addEventListener("popstate", restore);
  window.addEventListener("hashchange", restore);
  window.addEventListener(
    "scroll",
    () => {
      scheduleTrack();
      clearTimeout(storeTimer);
      storeTimer = setTimeout(() => {
        if (!scrollTarget() && !document.querySelector("dialog[open]"))
          rememberScroll();
      }, 180);
    },
    { passive: true },
  );
  window.addEventListener("loka:scrollstart", scheduleTrack);
  window.addEventListener("loka:scrollend", scheduleTrack);
  window.addEventListener(
    "resize",
    () => {
      moveIndicators();
      scheduleTrack();
    },
    { passive: true },
  );
  window.addEventListener("pageshow", scheduleTrack);
  window.addEventListener("pagehide", () => {
    clearTimeout(storeTimer);
    rememberScroll();
  });
  document.fonts?.ready.then(moveIndicators);
  if ("ResizeObserver" in window) {
    const observer = new ResizeObserver(moveIndicators);
    tracks.forEach((track) => observer.observe(track));
  }
  synchronize();
  highlight("beranda");
  const initialTicket = ticket;
  requestAnimationFrame(() => {
    if (ticket !== initialTicket) return;
    if (currentURL().hash) followHash({ immediate: true });
    else trackSection();
    moveIndicators();
  });
}
