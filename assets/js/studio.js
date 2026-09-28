import { currentURL } from "./utils.js?v=20260923r";
import { photoFor } from "./media.js?v=20260923";
import {
  ui,
  element,
  toast,
  run,
  download,
  readLocal,
  writeLocal,
  confirmAction,
  scrollToElement,
  shareWhatsApp,
} from "./utils.js?v=20260923";
const storageKey = "lokanaik.catalogs.v1";
const categories = ["Kerajinan", "Kuliner", "Pakaian", "Keramik"];
const money = (value) => "Rp " + new Intl.NumberFormat("id-ID").format(value);
const safeImage = (value) =>
  typeof value === "string" &&
  (!!photoFor(value) ||
    (/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(value) &&
      value.length <= 900000));
function cleanDraft(value) {
  if (
    !value ||
    typeof value !== "object" ||
    typeof value.id !== "string" ||
    !/^[a-zA-Z0-9_-]{1,80}$/.test(value.id)
  )
    return null;
  if (
    !Number.isSafeInteger(value.price) ||
    value.price < 0 ||
    value.price > 1000000000
  )
    return null;
  return {
    id: value.id,
    title: String(value.title || "").slice(0, 80),
    category: categories.includes(value.category)
      ? value.category
      : "Kerajinan",
    size: String(value.size || "").slice(0, 200),
    description: String(value.description || "").slice(0, 240),
    price: value.price,
    isReady: value.isReady === true,
    image:
      value.image === "assets/images/chips.webp"
        ? "assets/images/asset-12c8310caa33.jpg"
        : safeImage(value.image)
          ? value.image
          : "",
  };
}
function readDrafts() {
  const data = readLocal(storageKey, []);
  return Array.isArray(data)
    ? data.slice(0, 8).map(cleanDraft).filter(Boolean)
    : [];
}
export function setupStudio() {
  const root = document.getElementById("studio"),
    get = (name) => ui(root, name),
    preview = get("preview-image");
  const price = document.getElementById("studio-price"),
    fileInput = get("input-file"),
    imageStatus = document.getElementById("studio-photo-status");
  const initial = {
    title: "Keripik Pisang Cokelat",
    category: "Kuliner",
    size: "Pisang kepok, cokelat; berat bersih 200 g",
    description:
      "Keripik pisang rasa cokelat dalam kemasan zip 200 g. Simpan di tempat kering dan tutup kembali setelah dibuka.",
    price: 25000,
    isReady: true,
    image: "assets/images/asset-12c8310caa33.jpg",
  };
  let product = { ...initial },
    currentId = null,
    imageRevision = 0,
    imagePending = false;
  const emptyPhoto = element("div", "Tambahkan foto produk", "empty-photo");
  preview.after(emptyPhoto);
  function edited() {
    get("save-status").textContent = "Perubahan belum disimpan.";
  }
  function update() {
    for (const [name, value] of [
      ["preview-title", product.title || "Nama produk"],
      ["preview-category-tag", product.category],
      ["preview-specs", product.size || "Bahan dan ukuran"],
      ["preview-desc", product.description || "Deskripsi produk"],
    ])
      get(name).textContent = value;
    get("preview-price").textContent = price.validity.valid
      ? money(product.price)
      : "Periksa harga";
    get("preview-badge").textContent = product.isReady
      ? "Tersedia"
      : "Pre-order";
    get("title-counter").textContent = product.title.length + " / 80";
    get("desc-counter").textContent = product.description.length + " / 240";
    preview.hidden = !product.image;
    emptyPhoto.hidden = !!product.image;
    if (product.image) {
      preview.src = product.image;
      preview.alt = "Foto " + product.title;
    }
    const photo = photoFor(product.image),
      credit = document.getElementById("studio-photo-source");
    credit.hidden = !photo;
    if (photo) {
      credit.href = photo.source;
      credit.textContent = `${photo.credit} ↗`;
      preview.alt = photo.alt;
      preview.dataset.source = photo.source;
      preview.title = photo.credit;
    } else {
      preview.removeAttribute("data-source");
      preview.removeAttribute("data-photo");
      preview.removeAttribute("title");
    }
    root.querySelectorAll(".cat-pill").forEach((button) => {
      const active = button.dataset.cat === product.category;
      button.setAttribute("aria-pressed", String(active));
      button.classList.toggle("active-filter", active);
      button.classList.remove("bg-primary", "text-on-primary");
    });
    for (const [name, active] of [
      ["status-ready", product.isReady],
      ["status-po", !product.isReady],
    ]) {
      const button = get(name);
      button.setAttribute("aria-pressed", String(active));
      button.classList.toggle("active-filter", active);
      button.classList.remove("bg-primary-container", "text-on-primary");
    }
  }
  function fill() {
    imageRevision++;
    imagePending = false;
    fileInput.value = "";
    imageStatus.textContent = "";
    get("input-title").value = product.title;
    get("input-specs").value = product.size;
    get("input-desc").value = product.description;
    price.value = String(product.price);
    get("input-price").value = String(product.price);
    update();
  }
  for (const [name, key, max] of [
    ["input-title", "title", 80],
    ["input-specs", "size", 200],
    ["input-desc", "description", 240],
  ]) {
    const input = get(name);
    input.maxLength = max;
    input.addEventListener("input", () => {
      product[key] = input.value.slice(0, max);
      edited();
      update();
    });
  }
  price.addEventListener("input", () => {
    product.price = Number(price.value);
    get("input-price").value = price.value;
    edited();
    update();
  });
  root.querySelectorAll(".cat-pill").forEach((button) =>
    button.addEventListener("click", () => {
      product.category = button.dataset.cat;
      edited();
      update();
    }),
  );
  get("status-ready").addEventListener("click", () => {
    product.isReady = true;
    edited();
    update();
  });
  get("status-po").addEventListener("click", () => {
    product.isReady = false;
    edited();
    update();
  });
  async function loadImage(file) {
    if (!file) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      !file.size ||
      file.size > 5 * 1024 * 1024
    )
      throw Error("Pilih foto JPG, PNG, atau WebP maksimal 5 MB.");
    const ticket = ++imageRevision;
    imagePending = true;
    imageStatus.textContent = "Memproses foto…";
    let bitmap, objectURL;
    try {
      const head = new Uint8Array(await file.slice(0, 32).arrayBuffer());
      const png =
        head[0] === 137 && head[1] === 80 && head[2] === 78 && head[3] === 71;
      const jpeg = head[0] === 255 && head[1] === 216 && head[2] === 255;
      const webp =
        String.fromCharCode(...head.slice(0, 4)) === "RIFF" &&
        String.fromCharCode(...head.slice(8, 12)) === "WEBP";
      if (
        !(
          (file.type === "image/png" && png) ||
          (file.type === "image/jpeg" && jpeg) ||
          (file.type === "image/webp" && webp)
        )
      )
        throw Error("Isi berkas tidak sesuai format gambar.");
      if (png && head.length >= 24) {
        const view = new DataView(head.buffer);
        if (view.getUint32(16) * view.getUint32(20) > 36000000)
          throw Error("Gunakan foto dengan resolusi maksimal 36 megapiksel.");
      }
      if ("createImageBitmap" in window) {
        try {
          bitmap = await createImageBitmap(file);
        } catch {
          /* Some browsers decode a valid image only through HTMLImageElement. */
        }
      }
      if (!bitmap) {
        objectURL = URL.createObjectURL(file);
        bitmap = new Image();
        bitmap.src = objectURL;
        await bitmap.decode();
      }
      const width = bitmap.width,
        height = bitmap.height;
      if (!width || !height || width * height > 36000000)
        throw Error("Gunakan foto dengan resolusi maksimal 36 megapiksel.");
      const canvas = element("canvas"),
        scale = Math.min(1, 1200 / Math.max(width, height));
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      const context = canvas.getContext("2d");
      if (!context)
        throw Error("Pemrosesan foto tidak tersedia di browser ini.");
      context.fillStyle = "#fff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      let encoded = canvas.toDataURL("image/jpeg", 0.86);
      if (encoded.length > 900000)
        encoded = canvas.toDataURL("image/jpeg", 0.7);
      if (encoded.length > 900000)
        throw Error(
          "Foto masih terlalu besar setelah diproses. Pilih foto dengan detail lebih sederhana.",
        );
      if (ticket !== imageRevision) return;
      product.image = encoded;
      edited();
      update();
      imageStatus.textContent = "Foto siap. Foto tidak diunggah ke server.";
    } catch (error) {
      if (ticket !== imageRevision) return;
      imageStatus.textContent =
        error.message?.startsWith("Gunakan") ||
        error.message?.startsWith("Isi berkas") ||
        error.message?.startsWith("Foto masih")
          ? error.message
          : "Foto tidak dapat dibuka. Pilih berkas gambar yang valid.";
      throw Error(imageStatus.textContent);
    } finally {
      bitmap?.close?.();
      if (objectURL) URL.revokeObjectURL(objectURL);
      if (ticket === imageRevision) imagePending = false;
    }
  }
  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    fileInput.value = "";
    loadImage(file).catch((error) => toast(error.message));
  });
  const drop = get("dropzone");
  drop.addEventListener("dragover", (event) => {
    event.preventDefault();
    drop.classList.add("drag-active");
  });
  drop.addEventListener("dragleave", () =>
    drop.classList.remove("drag-active"),
  );
  drop.addEventListener("drop", (event) => {
    event.preventDefault();
    drop.classList.remove("drag-active");
    loadImage(event.dataTransfer.files[0]).catch((error) =>
      toast(error.message),
    );
  });
  document
    .getElementById("studio-change-photo")
    .addEventListener("click", () => fileInput.click());
  document
    .getElementById("studio-remove-photo")
    .addEventListener("click", () => {
      imageRevision++;
      imagePending = false;
      product.image = "";
      fileInput.value = "";
      imageStatus.textContent = "Foto dihapus dari formulir.";
      edited();
      update();
    });
  get("btn-quick-sample").addEventListener("click", () => {
    product = {
      ...initial,
      title: "Keripik Pisang Cokelat 200 g",
      size: "Pisang; berat bersih 200 g",
      description:
        "Keripik pisang cokelat dalam kemasan zip 200 g. Tutup kembali setelah dibuka dan simpan di tempat kering.",
    };
    currentId = null;
    fill();
    edited();
  });
  get("btn-reset").addEventListener("click", () =>
    confirmAction(
      "Reset formulir",
      "Kosongkan formulir? Rancangan yang sudah disimpan tetap tersedia.",
      "Kosongkan",
      () => {
        product = {
          title: "",
          category: "Kerajinan",
          size: "",
          description: "",
          price: 0,
          isReady: true,
          image: "",
        };
        currentId = null;
        fill();
        get("save-status").textContent = "Formulir dikosongkan.";
        get("input-title").focus();
      },
    ),
  );
  function validate() {
    if (product.title.trim().length < 2) {
      get("input-title").focus();
      throw Error("Isi nama produk minimal dua karakter.");
    }
    if (!product.size.trim()) {
      get("input-specs").focus();
      throw Error("Isi bahan atau ukuran produk.");
    }
    if (product.description.trim().length < 10) {
      get("input-desc").focus();
      throw Error("Isi deskripsi minimal 10 karakter.");
    }
    if (
      !price.validity.valid ||
      !Number.isSafeInteger(product.price) ||
      product.price < 0 ||
      product.price > 1000000000
    ) {
      price.focus();
      throw Error("Isi harga rupiah bulat antara 0 dan 1.000.000.000.");
    }
    if (imagePending) throw Error("Tunggu foto selesai diproses.");
  }
  function text() {
    return [
      "KATALOG PRODUK — LOKANAIK",
      product.title,
      "Kategori: " + product.category,
      "Bahan/ukuran: " + product.size,
      "Harga: " + money(product.price),
      "Ketersediaan: " +
        (product.isReady
          ? "Tersedia"
          : "Pre-order — konfirmasi waktu produksi"),
      "",
      product.description,
      ...(photoFor(product.image)
        ? [
            "",
            photoFor(product.image).credit,
            photoFor(product.image).source,
            photoFor(product.image).license,
            "Foto diperkecil dan dipotong sesuai bingkai.",
          ]
        : []),
    ].join("\n");
  }
  get("btn-scroll-preview").addEventListener("click", () => {
    update();
    scrollToElement(get("preview-card"), "center");
    get("preview-card").focus({ preventScroll: true });
  });
  get("btn-download-txt").addEventListener("click", (event) =>
    run(event.currentTarget, () => {
      validate();
      download(text(), "ringkasan-katalog-lokanaik.txt");
    }),
  );
  get("share-catalog").addEventListener("click", (event) =>
    run(event.currentTarget, () => {
      validate();
      shareWhatsApp(text());
    }),
  );
  get("save-draft").addEventListener("click", (event) =>
    run(event.currentTarget, () => {
      validate();
      const drafts = readDrafts();
      if (!drafts.some((draft) => draft.id === currentId) && drafts.length >= 8)
        throw Error(
          "Maksimal delapan rancangan per perangkat. Hapus rancangan yang tidak diperlukan.",
        );
      currentId ||=
        crypto.randomUUID?.() ||
        Date.now().toString(36) + Math.random().toString(36).slice(2);
      const record = { ...product, id: currentId },
        existing = drafts.findIndex((draft) => draft.id === currentId);
      if (existing >= 0) drafts[existing] = record;
      else drafts.push(record);
      const saved = writeLocal(storageKey, drafts);
      get("save-status").textContent = saved
        ? "Rancangan tersimpan pada perangkat ini."
        : "Rancangan hanya tersimpan sementara pada halaman ini. Unduh ringkasan untuk menyimpan salinan.";
      if (!get("saved-drafts").hidden) showDrafts();
    }),
  );
  function showDrafts() {
    const box = get("saved-drafts"),
      drafts = readDrafts();
    box.hidden = false;
    box.replaceChildren(
      element("h3", "Rancangan pada perangkat ini", "font-bold"),
    );
    if (!drafts.length)
      box.append(element("p", "Belum ada rancangan tersimpan.", "mt-3"));
    for (const draft of drafts) {
      const row = element("div", undefined, "draft-row"),
        open = element("button", "Buka", "loka-btn"),
        remove = element("button", "Hapus", "loka-btn subtle");
      open.type = remove.type = "button";
      open.setAttribute("aria-label", "Buka " + draft.title);
      remove.setAttribute("aria-label", "Hapus " + draft.title);
      row.append(element("span", draft.title), open, remove);
      box.append(row);
      open.addEventListener("click", () => {
        const { id, ...data } = draft;
        currentId = id;
        product = { ...data };
        fill();
        get("save-status").textContent = "Mengedit rancangan: " + draft.title;
        get("input-title").focus();
      });
      remove.addEventListener("click", () =>
        confirmAction(
          "Hapus rancangan",
          `Hapus “${draft.title}” dari perangkat ini?`,
          "Hapus rancangan",
          () => {
            const saved = writeLocal(
              storageKey,
              readDrafts().filter((item) => item.id !== draft.id),
            );
            if (currentId === draft.id) currentId = null;
            showDrafts();
            if (saved) toast("Rancangan dihapus.");
          },
        ),
      );
    }
  }
  get("list-drafts").addEventListener("click", showDrafts);
  get("download-card").addEventListener("click", (event) =>
    run(event.currentTarget, async () => {
      validate();
      const snapshot = { ...product };
      await document.fonts.ready;
      let image = null;
      if (snapshot.image) {
        image = new Image();
        image.src = snapshot.image;
        try {
          await image.decode();
        } catch {
          throw Error(
            "Foto belum dapat diekspor. Pilih ulang foto atau unduh ringkasan teks.",
          );
        }
      }
      const canvas = element("canvas");
      canvas.width = 1000;
      const context = canvas.getContext("2d");
      if (!context)
        throw Error(
          "Ekspor gambar tidak tersedia di browser ini. Unduh ringkasan teks.",
        );
      function wrap(value, font) {
        context.font = font;
        const lines = [];
        let line = "";
        for (const word of value.trim().split(/\s+/)) {
          const candidate = line ? line + " " + word : word;
          if (context.measureText(candidate).width <= 880) {
            line = candidate;
            continue;
          }
          if (line) lines.push(line);
          line = "";
          for (const char of word) {
            if (context.measureText(line + char).width > 880) {
              lines.push(line);
              line = "";
            }
            line += char;
          }
        }
        if (line) lines.push(line);
        return lines;
      }
      const blocks = [
        [snapshot.category, '600 24px "Plus Jakarta Sans"', 36],
        [snapshot.title, '800 38px "Plus Jakarta Sans"', 50],
        [money(snapshot.price), '700 30px "Plus Jakarta Sans"', 42],
        [snapshot.size, '600 24px "Plus Jakarta Sans"', 36],
        [snapshot.description, '400 24px "Plus Jakarta Sans"', 36],
        ...(photoFor(snapshot.image)
          ? [
              [
                photoFor(snapshot.image).credit,
                '400 18px "Plus Jakarta Sans"',
                28,
              ],
              [
                photoFor(snapshot.image).source,
                '400 18px "Plus Jakarta Sans"',
                28,
              ],
              [
                photoFor(snapshot.image).license,
                '400 18px "Plus Jakarta Sans"',
                28,
              ],
              [
                "Foto diperkecil dan dipotong sesuai bingkai.",
                '400 18px "Plus Jakarta Sans"',
                28,
              ],
            ]
          : []),
      ].map(([value, font, height]) => ({
        lines: wrap(value, font),
        font,
        height,
      }));
      canvas.height = Math.max(
        1280,
        760 +
          blocks.reduce(
            (total, block) => total + block.lines.length * block.height + 16,
            0,
          ),
      );
      context.fillStyle = "#fff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = "#EAF2EC";
      context.fillRect(0, 0, 1000, 620);
      if (image) {
        const ratio = Math.max(1000 / image.width, 620 / image.height);
        context.save();
        context.beginPath();
        context.rect(0, 0, 1000, 620);
        context.clip();
        context.drawImage(
          image,
          (1000 - image.width * ratio) / 2,
          (620 - image.height * ratio) / 2,
          image.width * ratio,
          image.height * ratio,
        );
        context.restore();
      }
      context.fillStyle = "#D6F264";
      context.fillRect(48, 48, 260, 52);
      context.fillStyle = "#123C32";
      context.font = '600 24px "Plus Jakarta Sans"';
      context.fillText(snapshot.isReady ? "Tersedia" : "Pre-order", 68, 82);
      let y = 690;
      for (const block of blocks) {
        context.font = block.font;
        context.fillStyle = "#123C32";
        for (const line of block.lines) {
          context.fillText(line, 60, y);
          y += block.height;
        }
        y += 16;
      }
      context.font = '600 22px "Plus Jakarta Sans"';
      context.fillStyle = "#08765B";
      context.fillText(
        "LokaNaik • Usaha lokal. Langkah besar.",
        60,
        canvas.height - 35,
      );
      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/png"),
      );
      if (!blob) throw Error("Kartu belum berhasil dibuat. Coba kembali.");
      download(blob, "katalog-lokanaik.png");
    }),
  );
  const kg = get("weight-kg"),
    grams = get("weight-grams");
  function convert() {
    const value = Number(kg.value);
    grams.textContent =
      kg.value !== "" && Number.isFinite(value) && value >= 0 && value <= 100000
        ? new Intl.NumberFormat("id-ID", { maximumFractionDigits: 3 }).format(
            value * 1000,
          ) + " gram"
        : "Masukkan berat antara 0 dan 100.000 kg.";
  }
  kg.addEventListener("input", convert);
  grams.setAttribute("role", "status");
  const conversion = document.getElementById("konversi-berat");
  function openLinkedTool() {
    if (currentURL().hash !== "#konversi-berat") return;
    conversion.open = true;
    requestAnimationFrame(() => scrollToElement(conversion));
  }
  window.addEventListener("loka:navigate", openLinkedTool);
  window.addEventListener("storage", () => {
    if (!get("saved-drafts").hidden) showDrafts();
  });
  fill();
  convert();
  openLinkedTool();
}
