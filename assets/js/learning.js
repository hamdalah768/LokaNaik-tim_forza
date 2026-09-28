import { currentURL, writeHistory } from "./utils.js?v=20260923r";
import { lessons } from "./content.js?v=20260923";
import {
  ui,
  element,
  toast,
  confirmAction,
  scrollToElement,
} from "./utils.js?v=20260923";
import {
  readProgress,
  saveProgress,
  resetProgress,
  rememberModule,
  completedCount,
  progressIsPersistent,
} from "./progress.js?v=20260923";
import { setupComparison } from "./comparison.js?v=20260923";
export function setupLearningHub() {
  const root = document.getElementById("belajar");
  function render() {
    const data = readProgress();
    root.querySelectorAll("[data-progress]").forEach((node) => {
      const item = data[node.dataset.progress];
      node.textContent = item.completed
        ? "Selesai ✓"
        : `${item.tasks.filter(Boolean).length}/3 langkah dikerjakan`;
    });
    ui(root, "storage-status").textContent =
      `Progres perangkat ini: ${completedCount()}/3 modul selesai`;
  }
  ui(root, "btn-reset").addEventListener("click", () =>
    confirmAction(
      "Reset progres belajar",
      "Hapus progres ketiga modul dari perangkat ini?",
      "Reset progres",
      () => {
        const saved = resetProgress();
        render();
        if (saved) toast("Progres belajar kembali ke awal.");
      },
    ),
  );
  window.addEventListener("storage", render);
  window.addEventListener("loka:progress", render);
  window.addEventListener("pageshow", render);
  render();
}
export function setupLesson() {
  const root = document.getElementById("materi"),
    resetComparison = setupComparison(root);
  let current = lessons[0],
    progress,
    persisted = true;
  const title = document.getElementById("lesson-title");
  const sourceContainer = ui(root, "source-links");
  const list = (id, values) =>
    document
      .getElementById(id)
      .replaceChildren(...values.map((value) => element("li", value)));
  function restoreAnswer() {
    root.querySelectorAll('[name="quiz-answer"]').forEach((input) => {
      input.checked = progress.answer === Number(input.value);
    });
    ui(root, "quiz-feedback").textContent = progress.checked
      ? (progress.correct ? "Benar. " : "Belum tepat. ") +
        current.explanation +
        (progress.correct
          ? ""
          : " Kamu bisa memilih jawaban lain dan mencoba lagi.")
      : "";
  }
  function updateStage() {
    const links = [...root.querySelectorAll("[data-lesson-stages] > a")];
    const chosen = Math.max(
      0,
      links.findIndex((link) => link.hash === currentURL().hash),
    );
    links.forEach((link, i) => {
      const active = i === chosen;
      if (active) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
      link.querySelector("span").textContent =
        `Tahap 0${i + 1}${active ? " • Aktif" : ""}`;
      link.querySelector(".material-symbols-outlined").textContent = active
        ? "radio_button_checked"
        : "trip_origin";
    });
  }
  function updateProgress() {
    ui(root, "checklist-counter").textContent =
      `${progress.tasks.filter(Boolean).length} / 3`;
    root.querySelectorAll('[data-ui-id^="task-"]').forEach((input, i) => {
      input.checked = progress.tasks[i];
    });
    ui(root, "btn-complete-text").textContent = progress.completed
      ? "Batalkan selesai"
      : "Tandai selesai";
    ui(root, "completion-toast").hidden = !progress.completed;
    ui(root, "completion-toast").textContent = persisted
      ? "Modul selesai dan tersimpan pada perangkat ini."
      : "Modul selesai untuk sesi ini; penyimpanan perangkat tidak tersedia.";
    document.getElementById("lesson-completion-help").textContent = !persisted
      ? "Perubahan belum tersimpan permanen. Penyimpanan browser tidak tersedia."
      : progress.completed
        ? "Kamu dapat membatalkan status selesai atau mengulang modul."
        : "Selesaikan tiga checklist dan jawab pertanyaan dengan benar.";
  }
  function persist() {
    persisted = saveProgress(current.slug, progress);
    updateProgress();
  }
  function load() {
    const id = currentURL().searchParams.get("modul") || "foto";
    current = lessons.find((lesson) => lesson.slug === id) || lessons[0];
    if (id !== current.slug) {
      const url = currentURL();
      url.searchParams.set("modul", current.slug);
      writeHistory("replace", {}, "", url);
    }
    progress = readProgress()[current.slug];
    persisted = progressIsPersistent();
    root.dataset.currentLesson = current.slug;
    title.textContent = `${current.number} — ${current.name}`;
    document.getElementById("lesson-subtitle").textContent =
      current.description;
    for (const [selector, value] of [
      ["[data-lesson-badge]", "Modul " + current.number],
      ["[data-lesson-time]", current.duration + " menit praktik"],
      ["[data-lesson-category]", current.name],
      ["[data-lesson-breadcrumb]", current.name],
    ])
      root.querySelector(selector).textContent = value;
    document.getElementById("lesson-goal").textContent = current.goal;
    document.getElementById("lesson-intro").textContent = current.intro;
    document.getElementById("lesson-example").textContent = current.example;
    list("lesson-mistakes", current.mistakes);
    list("lesson-summary", current.summary);
    root.querySelectorAll("[data-module-content]").forEach((panel) => {
      panel.hidden = panel.dataset.moduleContent !== current.slug;
    });
    root.querySelectorAll("[data-module-link]").forEach((link) => {
      if (link.dataset.moduleLink === current.slug)
        link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    root.querySelectorAll("[data-lesson-stages] > a").forEach((link, i) => {
      link.href = `#${current.slug}-part-${i + 1}`;
      link.querySelectorAll("p")[0].textContent = current.checkpoints[i];
      link.querySelectorAll("p")[1].textContent = "Buka langkah " + (i + 1);
    });
    root.querySelector("[data-lesson-checklist-intro]").textContent =
      `Praktikkan materi ${current.name.toLowerCase()}, lalu periksa pemahamanmu.`;
    root.querySelectorAll('[data-ui-id^="task-"]').forEach((input, i) => {
      input.closest("label").querySelector("span").textContent =
        current.tasks[i];
    });
    root
      .querySelector("[data-lesson-tools]")
      .replaceChildren(
        ...current.toolkit.map((text) => element("li", text, "py-1")),
      );
    const toolLink = root.querySelector("[data-lesson-tool-link]");
    toolLink.textContent =
      current.slug === "keamanan"
        ? "Buka panduan keamanan Google ↗"
        : "Buka Studio Katalog →";
    toolLink.href =
      current.slug === "keamanan" ? current.sources[0].url : "#studio";
    if (current.slug === "keamanan") {
      toolLink.target = "_blank";
      toolLink.rel = "noopener noreferrer";
    } else {
      toolLink.removeAttribute("target");
      toolLink.removeAttribute("rel");
    }
    ui(root, "quiz-question").textContent = current.question;
    ui(root, "quiz-options").replaceChildren(
      ...current.answers.map((text, index) => {
        const label = element("label", undefined, "quiz-choice"),
          input = element("input");
        input.type = "radio";
        input.name = "quiz-answer";
        input.value = String(index);
        label.append(input, element("span", text));
        return label;
      }),
    );
    restoreAnswer();
    sourceContainer.replaceChildren(
      ...current.sources.map((source) => {
        const card = element("article", undefined, "source-card");
        const link = element("a", source.title + " ↗", "source-link");
        link.href = source.url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        card.append(
          element("p", source.organization, "text-label-caps text-primary"),
          link,
          element("p", source.context, "text-body-sm mt-2"),
        );
        return card;
      }),
    );
    const index = lessons.indexOf(current),
      prev = document.getElementById("lesson-prev"),
      next = document.getElementById("lesson-next");
    prev.href = index ? lessons[index - 1].url : "#belajar";
    prev.textContent =
      "← Sebelumnya: " + (index ? lessons[index - 1].name : "Ruang Belajar");
    next.href = index < 2 ? lessons[index + 1].url : "#belajar";
    next.textContent =
      index < 2
        ? "Selanjutnya: " + lessons[index + 1].name + " →"
        : "Kembali ke Belajar →";
    rememberModule(current.slug);
    resetComparison();
    updateProgress();
    updateStage();
  }
  root.addEventListener("change", (event) => {
    const index = ["task-1", "task-2", "task-3"].indexOf(
      event.target.dataset.uiId,
    );
    if (index >= 0) {
      progress.tasks[index] = event.target.checked;
      if (!progress.tasks.every(Boolean)) progress.completed = false;
      persist();
    }
    if (event.target.name === "quiz-answer") {
      progress.answer = Number(event.target.value);
      progress.checked = false;
      progress.correct = false;
      progress.completed = false;
      ui(root, "quiz-feedback").textContent = "";
      persist();
    }
  });
  ui(root, "quiz-check").addEventListener("click", () => {
    const selected = root.querySelector('input[name="quiz-answer"]:checked'),
      feedback = ui(root, "quiz-feedback");
    if (!selected) {
      feedback.textContent = "Pilih satu jawaban terlebih dahulu.";
      root.querySelector('input[name="quiz-answer"]').focus();
      return;
    }
    progress.correct = Number(selected.value) === current.correct;
    progress.answer = Number(selected.value);
    progress.checked = true;
    if (!progress.correct) progress.completed = false;
    feedback.textContent =
      (progress.correct ? "Benar. " : "Belum tepat. ") +
      current.explanation +
      (progress.correct
        ? ""
        : " Kamu bisa memilih jawaban lain dan mencoba lagi.");
    persist();
  });
  ui(root, "btn-complete").addEventListener("click", () => {
    if (progress.completed) {
      progress.completed = false;
      persist();
      return;
    }
    if (!progress.tasks.every(Boolean) || !progress.correct) {
      const message = !progress.tasks.every(Boolean)
        ? "Selesaikan ketiga langkah latihan terlebih dahulu."
        : "Periksa jawaban dan jawab dengan benar terlebih dahulu.";
      ui(root, "quiz-feedback").textContent = message;
      toast(message);
      return;
    }
    progress.completed = true;
    persist();
  });
  document.getElementById("lesson-reset").addEventListener("click", () =>
    confirmAction(
      "Ulangi modul",
      `Reset checklist dan hasil kuis ${current.name} pada perangkat ini?`,
      "Ulangi modul",
      () => {
        progress = {
          tasks: [false, false, false],
          answer: null,
          checked: false,
          correct: false,
          completed: false,
        };
        persist();
        ui(root, "quiz-feedback").textContent = "";
        root.querySelectorAll('input[name="quiz-answer"]').forEach((input) => {
          input.checked = false;
        });
      },
    ),
  );
  window.addEventListener("loka:navigate", () => {
    const slug = currentURL().searchParams.get("modul") || "foto";
    if (slug !== current.slug) load();
    updateStage();
  });
  window.addEventListener("hashchange", updateStage);
  function refreshProgress() {
    progress = readProgress()[current.slug];
    persisted = progressIsPersistent();
    updateProgress();
    restoreAnswer();
  }
  window.addEventListener("loka:progress", refreshProgress);
  window.addEventListener("storage", (event) => {
    if (!event.key || event.key === "lokanaik.learning.v1") refreshProgress();
  });
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) refreshProgress();
  });
  load();
}
