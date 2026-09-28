let running = null;
const root = document.documentElement;
const preference = matchMedia("(prefers-reduced-motion: reduce)");
export const scrollTarget = () => running?.node || null;
export function rememberScroll() {
  history.replaceState({ ...history.state, lokaScrollY: window.scrollY }, "");
}
function finish(completed) {
  if (!running) return;
  const job = running;
  running = null;
  cancelAnimationFrame(job.frame);
  delete root.dataset.scrollRunning;
  if (completed) rememberScroll();
  window.dispatchEvent(
    new CustomEvent("loka:scrollend", {
      detail: { target: job.node, completed },
    }),
  );
  job.resolve(completed);
}
export function cancelScroll() {
  finish(false);
}
function reduced() {
  return preference.matches || root.dataset.motion === "reduced";
}
function destination(node, block) {
  if (node.id === "beranda") return 0;
  const box = node.getBoundingClientRect();
  const header =
    document.querySelector("body > header")?.getBoundingClientRect().height ||
    0;
  const top =
    block === "center"
      ? box.top +
        window.scrollY -
        (innerHeight - Math.min(box.height, innerHeight)) / 2
      : box.top + window.scrollY - header - 16;
  const limit = Math.max(
    0,
    (document.scrollingElement || root).scrollHeight - root.clientHeight,
  );
  return Math.max(0, Math.min(top, limit));
}
export function animateScroll(node, block = "start", options = {}) {
  if (!node?.isConnected) return Promise.resolve(false);
  if (running?.node === node) return running.promise;
  cancelScroll();
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  running = { node, block, options, promise, resolve, frame: 0 };
  root.dataset.scrollRunning = "true";
  window.dispatchEvent(
    new CustomEvent("loka:scrollstart", { detail: { target: node } }),
  );
  if (!root.clientHeight) {
    node.scrollIntoView({ block, behavior: "instant" });
    finish(true);
    return promise;
  }
  const start = window.scrollY;
  const end =
    options.top === undefined
      ? destination(node, block)
      : Math.max(0, options.top);
  const distance = end - start;
  if (options.immediate || reduced() || Math.abs(distance) < 2) {
    window.scrollTo({ top: end, behavior: "instant" });
    finish(true);
    return promise;
  }
  const job = running;
  const duration = Math.min(
    1450,
    Math.max(650, 520 + Math.sqrt(Math.abs(distance)) * 7),
  );
  let began;
  function tick(time) {
    if (running !== job) return;
    began ??= time;
    const progress = Math.min(1, (time - began) / duration);
    const eased =
      progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
    const currentEnd =
      options.top === undefined ? destination(node, block) : end;
    window.scrollTo({
      top: start + (currentEnd - start) * eased,
      behavior: "instant",
    });
    if (progress < 1) job.frame = requestAnimationFrame(tick);
    else finish(true);
  }
  job.frame = requestAnimationFrame(tick);
  return promise;
}
for (const name of ["wheel", "touchstart"])
  window.addEventListener(name, cancelScroll, { passive: true });
window.addEventListener("keydown", (event) => {
  if (event.key === "Tab") {
    cancelScroll();
    return;
  }
  if (event.target.closest?.('input,textarea,select,[contenteditable="true"]'))
    return;
  if (
    [
      "ArrowUp",
      "ArrowDown",
      "PageUp",
      "PageDown",
      "Home",
      "End",
      " ",
      "Escape",
    ].includes(event.key)
  )
    cancelScroll();
});
window.addEventListener("pointerdown", cancelScroll, { passive: true });
window.addEventListener("resize", cancelScroll, { passive: true });
window.addEventListener("pagehide", cancelScroll);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) cancelScroll();
});
window.addEventListener("loka:motionchange", () => {
  if (!running || !reduced()) return;
  const { node, block, options } = running;
  cancelScroll();
  animateScroll(node, block, { ...options, immediate: true });
});
