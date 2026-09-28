import {
  readLocal,
  writeLocal,
  isLocalPersistent,
} from "./utils.js?v=20260923";
import { lessons } from "./content.js?v=20260923";
const key = "lokanaik.learning.v1";
const modules = ["foto", "katalog", "keamanan"];
export function readProgress() {
  const raw = readLocal(key, {}),
    result = {};
  for (const id of modules) {
    const item = raw?.[id];
    const tasks =
      Array.isArray(item?.tasks) &&
      item.tasks.length === 3 &&
      item.tasks.every((v) => typeof v === "boolean")
        ? [...item.tasks]
        : [false, false, false];
    const lesson = lessons.find((entry) => entry.slug === id);
    // Migrate an already-passed v1 quiz without discarding existing progress.
    const answer =
      Number.isInteger(item?.answer) &&
      item.answer >= 0 &&
      item.answer < lesson.answers.length
        ? item.answer
        : item?.correct === true && item?.answer === undefined
          ? lesson.correct
          : null;
    const checked =
      answer !== null &&
      (item?.checked === true ||
        (item?.checked === undefined && item?.correct === true));
    const correct = checked && answer === lesson.correct;
    result[id] = {
      tasks,
      answer,
      checked,
      correct,
      completed: item?.completed === true && correct && tasks.every(Boolean),
    };
  }
  return result;
}
export function saveProgress(id, item) {
  if (!modules.includes(id)) return false;
  const data = readProgress();
  data[id] = {
    tasks: [...item.tasks],
    answer: item.answer ?? null,
    checked: item.checked === true,
    correct: item.correct === true,
    completed:
      item.completed === true && item.correct && item.tasks.every(Boolean),
  };
  const saved = writeLocal(key, data);
  window.dispatchEvent(new Event("loka:progress"));
  return saved;
}
export const resetProgress = () => {
  const saved = writeLocal(key, {});
  window.dispatchEvent(new Event("loka:progress"));
  return saved;
};
export const progressIsPersistent = () => isLocalPersistent(key);
export const completedCount = () =>
  Object.values(readProgress()).filter((item) => item.completed).length;
export function rememberModule(id) {
  if (modules.includes(id)) writeLocal("lokanaik.lastModule.v1", id);
}
