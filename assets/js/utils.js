import { animateScroll, rememberScroll } from "./scroll.js?v=20260924";
export const ui = (root, name) => root.querySelector(`[data-ui-id="${name}"]`);
export function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
let toastTimer;
export function toast(message) {
  const node = document.getElementById("app-toast");
  node.textContent = message;
  node.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    node.hidden = true;
  }, 6000);
}
const volatile = new Map();
const unreadable = new Set();
export const isLocalPersistent = (key) =>
  !volatile.has(key) && !unreadable.has(key);
export function readLocal(key, fallback) {
  if (volatile.has(key)) return volatile.get(key);
  try {
    const value = localStorage.getItem(key);
    unreadable.delete(key);
    return JSON.parse(value) ?? fallback;
  } catch {
    unreadable.add(key);
    return volatile.get(key) ?? fallback;
  }
}
export function writeLocal(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    volatile.delete(key);
    unreadable.delete(key);
    return true;
  } catch {
    volatile.set(key, value);
    toast(
      "Penyimpanan perangkat tidak tersedia. Perubahan hanya bertahan selama halaman ini terbuka.",
    );
    return false;
  }
}
window.addEventListener("storage", (event) => {
  if (event.key) volatile.delete(event.key);
  else volatile.clear();
});
export function scrollToElement(node, block = "start", options = {}) {
  return animateScroll(node, block, options);
}
let lastDialogFocus;
export function dialog(title, content) {
  const modal = document.getElementById("loka-dialog");
  document.getElementById("dialog-title").textContent = title;
  const body = document.getElementById("dialog-body");
  body.replaceChildren(
    typeof content === "string" ? element("p", content) : content,
  );
  if (!modal.open) {
    lastDialogFocus = document.activeElement;
    modal.showModal();
  } else document.getElementById("dialog-title").focus();
  return modal;
}
export function setupDialog() {
  const modal = document.getElementById("loka-dialog");
  modal
    .querySelector("[data-close-dialog]")
    .addEventListener("click", () => modal.close());
  modal.addEventListener("close", () => {
    if (lastDialogFocus?.isConnected)
      lastDialogFocus.focus({ preventScroll: true });
    else {
      const fallback = document.querySelector("#studio--list-drafts, main h1");
      if (fallback) {
        if (!fallback.matches("button, a, input")) fallback.tabIndex = -1;
        fallback.focus({ preventScroll: true });
      }
    }
  });
  modal.addEventListener("click", (event) => {
    const bounds = modal.getBoundingClientRect();
    if (
      event.target === modal &&
      (event.clientX < bounds.left ||
        event.clientX > bounds.right ||
        event.clientY < bounds.top ||
        event.clientY > bounds.bottom)
    )
      modal.close();
  });
}
export function confirmAction(title, message, label, action) {
  const body = element("div");
  body.append(element("p", message));
  const button = element("button", label, "loka-btn mt-4");
  button.type = "button";
  body.append(button);
  const modal = dialog(title, body);
  button.addEventListener("click", async () => {
    button.disabled = true;
    try {
      await action();
      modal.close();
    } catch (error) {
      toast(error.message);
    } finally {
      button.disabled = false;
    }
  });
}
export async function run(button, action) {
  if (button.disabled) return;
  button.disabled = true;
  try {
    return await action();
  } catch (error) {
    toast(error.message || "Tindakan belum berhasil. Coba kembali.");
  } finally {
    button.disabled = false;
  }
}
export function download(value, filename, type = "text/plain;charset=utf-8") {
  const blob = value instanceof Blob ? value : new Blob([value], { type });
  const url = URL.createObjectURL(blob),
    anchor = element("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
export function shareWhatsApp(text) {
  const link = new URL("https://wa.me/");
  link.searchParams.set("text", text);
  window.open(link.href, "_blank", "noopener,noreferrer");
}
export const plainClick = (event) =>
  event.button === 0 &&
  !event.ctrlKey &&
  !event.metaKey &&
  !event.shiftKey &&
  !event.altKey;

export function currentURL() {
  const url = new URL(location.href);
  if (url.protocol === "file:" && url.hash.includes("?")) {
    const at = url.hash.indexOf("?");
    const query = url.hash.slice(at + 1);
    url.hash = url.hash.slice(0, at);
    url.search = query;
  }
  return url;
}
export function writeHistory(kind, state, unused, value) {
  if (kind === "push") rememberScroll();
  const url = new URL(value, location.href);
  const method = kind === "push" ? "pushState" : "replaceState";
  if (location.protocol === "file:") {
    const target = new URL(location.href);
    target.hash = (url.hash || "#beranda") + url.search;
    try {
      history[method](state, "", target);
    } catch (error) {
      if (error.name !== "SecurityError") throw error;
      if (kind === "push") location.hash = target.hash;
      else location.replace(target.href);
      history.replaceState(state, "");
    }
  } else history[method](state, "", url);
  window.dispatchEvent(new Event("loka:historychange"));
}
