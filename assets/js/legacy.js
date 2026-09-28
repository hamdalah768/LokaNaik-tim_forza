// Keep existing bookmarks working after consolidating the website.
const destination = new URL("index.html", location.href);
const current = new URL(location.href);
const section = document.body.dataset.legacySection;
const sections = ["belajar", "materi", "studio", "cerita", "pencarian", "akun"];
if (sections.includes(section)) {
  destination.hash = section;
  if (section === "materi") {
    const slug = current.searchParams.get("modul");
    destination.searchParams.set(
      "modul",
      ["foto", "katalog", "keamanan"].includes(slug) ? slug : "foto",
    );
    if (/^#(?:foto|katalog|keamanan)-part-[123]$/.test(current.hash))
      destination.hash = current.hash;
  }
  if (section === "cerita") {
    const id = current.searchParams.get("cerita");
    if (["tenun", "kemasan", "keramik", "anyaman"].includes(id))
      destination.searchParams.set("cerita", id);
  }
  if (section === "pencarian") {
    const query = current.searchParams.get("q");
    if (query) destination.searchParams.set("q", query.slice(0, 200));
    const type = current.searchParams.get("type");
    if (["materi", "cerita", "alat"].includes(type))
      destination.searchParams.set("type", type);
  }
  if (section === "studio" && current.hash === "#konversi-berat")
    destination.hash = current.hash;
  document.querySelector("a").href = destination.href;
  location.replace(destination.href);
}
