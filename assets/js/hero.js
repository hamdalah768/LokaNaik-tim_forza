import { photos } from "./media.js?v=20260923";

export function setupHero() {
  const hero = document.getElementById("hero");
  if (!hero) return;
  const slides = [...hero.querySelectorAll(".hero-slide")];
  const source = document.getElementById("hero-source");
  const position = document.getElementById("hero-position");
  const pause = document.getElementById("hero-pause");
  const controls = hero.querySelector(".hero-controls");
  const preference = matchMedia("(prefers-reduced-motion: reduce)");
  let index = 0,
    timer = 0,
    userPaused = false,
    hovered = false,
    focused = false,
    visible = true;
  const reduced = () =>
    preference.matches || document.documentElement.dataset.motion === "reduced";
  function show(next) {
    index = (next + slides.length) % slides.length;
    slides.forEach((slide, i) => {
      slide.classList.toggle("is-current", i === index);
    });
    const photo = photos[slides[index].dataset.photo];
    source.href = photo.source;
    slides[index].dataset.source = photo.source;
    source.textContent = `${photo.credit} ↗`;
    position.textContent = `Foto ${index + 1} dari ${slides.length}`;
    hero.dataset.slide = String(index);
  }
  function schedule() {
    clearTimeout(timer);
    timer = 0;
    const stopped = userPaused || reduced();
    hero.dataset.visible = String(visible && !document.hidden && !stopped);
    pause.setAttribute("aria-pressed", String(stopped));
    pause.setAttribute(
      "aria-label",
      reduced()
        ? "Slideshow dijeda mengikuti pengaturan gerakan"
        : userPaused
          ? "Putar slideshow"
          : "Jeda slideshow",
    );
    pause.querySelector("span").textContent = stopped ? "play_arrow" : "pause";
    if (
      stopped ||
      hovered ||
      focused ||
      !visible ||
      document.hidden ||
      slides.length < 2
    )
      return;
    timer = window.setTimeout(() => {
      for (let count = 1; count < slides.length; count++) {
        const next = (index + count) % slides.length;
        if (slides[next].complete && slides[next].naturalWidth) {
          show(next);
          break;
        }
      }
      schedule();
    }, 5800);
  }
  function manual(delta) {
    let next = index;
    for (let count = 0; count < slides.length - 1; count++) {
      next = (next + delta + slides.length) % slides.length;
      if (slides[next].complete && slides[next].naturalWidth) {
        show(next);
        break;
      }
    }
    schedule();
  }
  document
    .getElementById("hero-prev")
    .addEventListener("click", () => manual(-1));
  document
    .getElementById("hero-next")
    .addEventListener("click", () => manual(1));
  pause.addEventListener("click", () => {
    if (!reduced()) userPaused = !userPaused;
    schedule();
  });
  controls.addEventListener("pointerenter", () => {
    hovered = true;
    schedule();
  });
  controls.addEventListener("pointerleave", () => {
    hovered = false;
    schedule();
  });
  controls.addEventListener("focusin", () => {
    focused = true;
    schedule();
  });
  controls.addEventListener("focusout", () =>
    queueMicrotask(() => {
      focused = controls.contains(document.activeElement);
      schedule();
    }),
  );
  function loadSlides() {
    for (const slide of slides) slide.loading = "eager";
  }
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        visible = entries[0].isIntersecting;
        if (visible) loadSlides();
        schedule();
      },
      { threshold: 0.05 },
    );
    observer.observe(hero);
  } else loadSlides();
  slides.forEach((slide) =>
    slide.addEventListener("load", schedule, { once: true }),
  );
  window.addEventListener("loka:motionchange", schedule);
  preference.addEventListener("change", schedule);
  document.addEventListener("visibilitychange", schedule);
  window.addEventListener("pagehide", () => {
    clearTimeout(timer);
    timer = 0;
  });
  window.addEventListener("pageshow", schedule);
  show(0);
  schedule();
}
