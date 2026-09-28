import { ui } from "./utils.js?v=20260923";
export function setupComparison(root) {
  const container = ui(root, "compare-container"),
    range = ui(root, "compare-range-input");
  const overlay = ui(root, "compare-overlay"),
    bar = ui(root, "compare-slider-bar");
  let activePointer = null,
    frame = 0,
    nextValue = 50;
  function paint(value) {
    const position = Math.max(0, Math.min(100, Number(value) || 0));
    range.value = String(position);
    container.style.setProperty("--compare-position", position + "%");
    overlay.style.clipPath = `inset(0 ${100 - position}% 0 0)`;
    bar.style.left = position + "%";
    range.setAttribute("aria-valuetext", `${position}% foto dengan reflektor`);
  }
  function position(event) {
    const bounds = container.getBoundingClientRect();
    if (bounds.width > 0)
      nextValue = Math.round(
        ((event.clientX - bounds.left) / bounds.width) * 100,
      );
    if (!frame)
      frame = requestAnimationFrame(() => {
        frame = 0;
        paint(nextValue);
      });
  }
  range.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || activePointer !== null) return;
    activePointer = event.pointerId;
    range.focus({ preventScroll: true });
    range.setPointerCapture(event.pointerId);
    event.preventDefault();
    position(event);
  });
  range.addEventListener("pointermove", (event) => {
    if (activePointer === event.pointerId) position(event);
  });
  function end(event) {
    if (activePointer !== event.pointerId) return;
    if (event.type === "pointerup") position(event);
    if (frame) {
      cancelAnimationFrame(frame);
      frame = 0;
      paint(nextValue);
    }
    activePointer = null;
    if (range.hasPointerCapture?.(event.pointerId))
      range.releasePointerCapture(event.pointerId);
  }
  for (const name of ["pointerup", "pointercancel", "lostpointercapture"])
    range.addEventListener(name, end);
  range.addEventListener("input", () => paint(range.value));
  window.addEventListener("resize", () => paint(range.value), {
    passive: true,
  });
  if ("ResizeObserver" in window)
    new ResizeObserver(() => paint(range.value)).observe(container);
  paint(50);
  return () => {
    if (activePointer !== null && range.hasPointerCapture?.(activePointer))
      range.releasePointerCapture(activePointer);
    activePointer = null;
    cancelAnimationFrame(frame);
    frame = 0;
    paint(50);
  };
}
