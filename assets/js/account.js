import { currentURL, writeHistory } from "./utils.js?v=20260923r";
import { dialog } from "./utils.js?v=20260923";
import { completedCount } from "./progress.js?v=20260923";
export function setupAccount() {
  const names = ["login", "register", "recovery", "verification"];
  const titles = {
    login: "Selamat datang kembali",
    register: "Mulai langkah belajarmu",
    recovery: "Pulihkan akses akun",
    verification: "Verifikasi nomor ponsel",
  };
  const $ = (id) => document.getElementById(id);
  const descriptions = new Map(
    [...document.querySelectorAll("[data-account-form] input")].map((input) => [
      input,
      input.getAttribute("aria-describedby"),
    ]),
  );
  let active = "login",
    revision = 0;
  function clearSecrets() {
    document.querySelectorAll("[data-account-form] input").forEach((input) => {
      input.value = "";
      input.removeAttribute("aria-invalid");
      const description = descriptions.get(input);
      if (description) input.setAttribute("aria-describedby", description);
      else input.removeAttribute("aria-describedby");
    });
    document.querySelectorAll("[data-password-toggle]").forEach((button) => {
      $(button.dataset.passwordToggle).type = "password";
      button.textContent = "Lihat";
      button.setAttribute("aria-pressed", "false");
    });
  }
  function switchTo(name, focus = false) {
    if (!names.includes(name)) return;
    active = name;
    revision++;
    clearSecrets();
    $("account-title").textContent = titles[name];
    $("account-success").hidden = true;
    $("account-feedback").hidden = true;
    for (const id of names) {
      $("account-" + id).hidden = id !== name;
      $("tab-" + id).setAttribute("aria-selected", String(id === name));
      $("tab-" + id).tabIndex = id === name ? 0 : -1;
    }
    if (focus) $("tab-" + name).focus();
  }
  function feedback(message, invalid) {
    const node = $("account-feedback");
    node.textContent = message;
    node.hidden = false;
    if (invalid) {
      invalid.setAttribute("aria-invalid", "true");
      invalid.setAttribute("aria-describedby", "account-feedback");
      invalid.focus();
    }
  }
  for (const [index, name] of names.entries()) {
    const tab = $("tab-" + name);
    tab.addEventListener("click", () => switchTo(name));
    tab.addEventListener("keydown", (event) => {
      if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key))
        return;
      event.preventDefault();
      const next =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? 3
            : (index + (event.key === "ArrowRight" ? 1 : 3)) % 4;
      switchTo(names[next], true);
    });
    const form = $("account-" + name);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      clearSecrets();
      feedback(
        "Layanan akun belum diaktifkan. Tidak ada data yang dikirim atau akun yang dibuat. Materi dan Studio tetap dapat digunakan tanpa masuk.",
      );
    });
    form.querySelectorAll("input").forEach((input) => {
      input.disabled = true;
    });
    form.querySelector("fieldset").disabled = false;
  }
  document
    .querySelectorAll("[data-account-open]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        switchTo(button.dataset.accountOpen, true),
      ),
    );
  document
    .querySelectorAll("[data-provider]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        dialog(
          "Metode belum tersedia",
          `Masuk dengan ${button.dataset.provider} belum tersedia. Kamu tetap dapat membaca seluruh materi dan menggunakan Studio tanpa akun.`,
        ),
      ),
    );
  document.querySelectorAll("[data-password-toggle]").forEach((button) =>
    button.addEventListener("click", () => {
      const input = $(button.dataset.passwordToggle),
        visible = input.type === "password";
      input.type = visible ? "text" : "password";
      button.textContent = visible ? "Sembunyikan" : "Lihat";
      button.setAttribute("aria-pressed", String(visible));
    }),
  );
  function refreshProgress() {
    document.querySelectorAll("[data-account-progress]").forEach((node) => {
      node.textContent = `${completedCount()} dari 3 modul selesai`;
    });
  }
  window.addEventListener("storage", refreshProgress);
  window.addEventListener("loka:progress", refreshProgress);
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) switchTo(active);
    refreshProgress();
  });
  window.addEventListener("pagehide", () => {
    revision++;
    clearSecrets();
  });
  window.addEventListener("loka:navigate", () => {
    if (currentURL().hash !== "#akun") {
      revision++;
      clearSecrets();
    }
  });

  const accountModal = document.getElementById("account-modal");
  const closeButton = document.getElementById("account-close");
  let accountOrigin = null,
    dismissTicket = 0,
    backdropStart = false;
  const reduced = () =>
    document.documentElement.dataset.motion === "reduced" ||
    matchMedia("(prefers-reduced-motion: reduce)").matches;
  function syncAccount() {
    dismissTicket++;
    const requested = currentURL().hash === "#akun";
    if (requested && !accountModal.open) {
      accountOrigin = document.activeElement;
      accountModal.showModal();
      accountModal.scrollTop = 0;
      if (!reduced() && accountModal.animate)
        accountModal.animate(
          [
            { opacity: 0, translate: "0 28px", scale: ".975" },
            { opacity: 1, translate: "0 0", scale: "1" },
          ],
          { duration: 420, easing: "cubic-bezier(.22,1,.36,1)" },
        );
      closeButton.focus({ preventScroll: true });
    } else if (!requested && accountModal.open) {
      accountModal.close();
      revision++;
      clearSecrets();
      if (accountOrigin?.isConnected)
        accountOrigin.focus({ preventScroll: true });
    }
  }
  async function dismissAccount() {
    if (!accountModal.open) return;
    const ticket = ++dismissTicket;
    if (!reduced() && accountModal.animate) {
      const animation = accountModal.animate(
        [
          { opacity: 1, translate: "0 0" },
          { opacity: 0, translate: "0 12px" },
        ],
        { duration: 150, easing: "ease-in" },
      );
      await animation.finished.catch(() => {});
    }
    if (ticket !== dismissTicket) return;
    if (history.state?.accountOverlay) history.back();
    else {
      const url = currentURL();
      url.hash = "beranda";
      writeHistory("replace", {}, "", url);
      window.dispatchEvent(new Event("loka:navigate"));
    }
  }
  document.addEventListener("click", (event) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    const link = event.target.closest("a[href]");
    if (!link || link.target) return;
    const url = new URL(link.href);
    if (
      url.origin !== location.origin ||
      url.pathname !== location.pathname ||
      url.hash !== "#akun"
    )
      return;
    event.preventDefault();
    if (currentURL().hash !== "#akun")
      writeHistory("push", { accountOverlay: true }, "", url);
    syncAccount();
    switchTo(link.dataset.accountDialog === "register" ? "register" : "login");
  });
  closeButton.addEventListener("click", dismissAccount);
  accountModal.addEventListener("cancel", (event) => {
    event.preventDefault();
    dismissAccount();
  });
  accountModal.addEventListener("pointerdown", (event) => {
    backdropStart = event.target === accountModal;
  });
  accountModal.addEventListener("click", (event) => {
    if (backdropStart && event.target === accountModal) dismissAccount();
    backdropStart = false;
  });
  window.addEventListener("loka:navigate", syncAccount);

  refreshProgress();
  switchTo("login");
  syncAccount();
}
