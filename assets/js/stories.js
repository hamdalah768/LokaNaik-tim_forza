import { currentURL, writeHistory } from "./utils.js?v=20260923r";
import { photoFor } from "./media.js?v=20260923";
import { stories, lessons } from "./content.js?v=20260923";
import { ui, element, plainClick, toast } from "./utils.js?v=20260923";
export function setupStories() {
  const root = document.getElementById("cerita"),
    modal = ui(root, "story-modal");
  const $ = (id) => document.getElementById(id);
  let current = null,
    previousFocus = null,
    closingFromHistory = false,
    touchStart = null;
  function render(story) {
    current = story;
    $("story-title").textContent = story.title;
    $("story-category").textContent = story.category;
    $("story-image").src = story.image;
    const photo = photoFor(story.image);
    $("story-image").alt = photo?.alt || story.alt;
    $("story-image").dataset.source = photo?.source || "";
    $("story-image").title = photo ? photo.credit : "";
    $("story-photo-source").href = photo?.source || "#sumber";
    $("story-photo-source").textContent = photo
      ? `${photo.credit} ↗`
      : "Sumber foto ↗";
    $("story-paragraphs").replaceChildren(
      ...story.paragraphs.map((text) => element("p", text)),
    );
    $("story-source-context").textContent =
      story.source.organization +
      " — bacaan pendukung. Foto adalah ilustrasi tema.";
    $("story-source").textContent = story.source.title + " ↗";
    $("story-source").href = story.source.url;
    const lesson = lessons.find((item) => item.slug === story.lesson);
    $("story-lesson").textContent = "Pelajari " + lesson.name + " →";
    $("story-lesson").href = lesson.url;
    $("story-position").textContent =
      `${stories.indexOf(story) + 1} / ${stories.length}`;
    root.querySelectorAll("[data-story]").forEach((link) => {
      if (link.dataset.story === story.id)
        link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    });
    if (!modal.open) modal.showModal();
    modal.querySelector(".story-scroll").scrollTop = 0;
    $("story-title").focus({ preventScroll: true });
  }
  function synchronize() {
    const id = currentURL().searchParams.get("cerita"),
      story = stories.find((item) => item.id === id);
    if (story) {
      if (!modal.open) previousFocus = document.activeElement;
      render(story);
    } else {
      if (modal.open) {
        closingFromHistory = true;
        modal.close();
      }
      if (id) {
        const url = currentURL();
        url.searchParams.delete("cerita");
        writeHistory("replace", {}, "", url);
        toast("Cerita tidak ditemukan. Pilih salah satu tema yang tersedia.");
      }
    }
  }
  function move(delta) {
    if (!current) return;
    const story =
      stories[
        (stories.indexOf(current) + delta + stories.length) % stories.length
      ];
    const url = currentURL();
    url.searchParams.set("cerita", story.id);
    writeHistory("replace", history.state, "", url);
    render(story);
  }
  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[data-story]");
    if (!link || !plainClick(event)) return;
    event.preventDefault();
    previousFocus = link;
    writeHistory("push", { lokaStoryModal: true }, "", link.href);
    synchronize();
  });
  modal
    .querySelector("[data-story-close]")
    .addEventListener("click", () => modal.close());
  modal.addEventListener("click", (event) => {
    if (event.target === modal) modal.close();
  });
  modal.addEventListener("close", () => {
    if (modal.open) {
      closingFromHistory = false;
      return;
    }
    if (!closingFromHistory && currentURL().searchParams.has("cerita")) {
      if (history.state?.lokaStoryModal) history.back();
      else {
        const url = currentURL();
        url.searchParams.delete("cerita");
        writeHistory("replace", {}, "", url);
      }
    }
    closingFromHistory = false;
    touchStart = null;
    root
      .querySelectorAll("[data-story]")
      .forEach((link) => link.removeAttribute("aria-current"));
    if (previousFocus?.isConnected)
      previousFocus.focus({ preventScroll: true });
  });
  $("story-prev").addEventListener("click", () => move(-1));
  $("story-next").addEventListener("click", () => move(1));
  modal.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      move(event.key === "ArrowRight" ? 1 : -1);
    }
  });
  $("story-image").addEventListener("pointerdown", (event) => {
    if (event.pointerType === "touch" && touchStart === null) {
      touchStart = { x: event.clientX, y: event.clientY, id: event.pointerId };
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  });
  $("story-image").addEventListener("pointerup", (event) => {
    if (!touchStart || touchStart.id !== event.pointerId) return;
    const x = event.clientX - touchStart.x,
      y = event.clientY - touchStart.y;
    touchStart = null;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    if (Math.abs(x) > 65 && Math.abs(y) < 40) move(x < 0 ? 1 : -1);
  });
  for (const name of ["pointercancel", "lostpointercapture"])
    $("story-image").addEventListener(name, (event) => {
      if (touchStart?.id === event.pointerId) touchStart = null;
    });
  root.querySelectorAll("[data-story-filter]").forEach((button) =>
    button.addEventListener("click", () => {
      const category = button.dataset.storyFilter;
      root.querySelectorAll("[data-story-card]").forEach((card) => {
        card.hidden = category !== "all" && card.dataset.storyCard !== category;
      });
      root
        .querySelectorAll("[data-story-filter]")
        .forEach((item) =>
          item.setAttribute("aria-pressed", String(item === button)),
        );
    }),
  );
  window.addEventListener("loka:navigate", synchronize);
  synchronize();
}
