// Affiche les guides Markdown de /docs/ avec le rendu minimal de common.js.
import { $$, esc, markdown } from "./common.js";
const PAGES = ["PRESENTATION", "GUIDE_USAGER", "GUIDE_ADMIN", "API", "ARCHITECTURE"];
async function show() {
  const name = PAGES.includes(location.hash.slice(1)) ? location.hash.slice(1) : PAGES[0];
  $$("#dnav a").forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + name));
  const doc = document.getElementById("doc");
  try {
    const r = await fetch(`/docs/${name}.md`); if (!r.ok) throw new Error(String(r.status));
    doc.innerHTML = markdown(await r.text());
    document.title = (doc.querySelector("h1")?.textContent || "Documentation") + " — Artisanat national";
  } catch (e) { doc.innerHTML = `<p>Document indisponible (${esc(e.message)}).</p>`; }
  window.scrollTo(0, 0);
}
addEventListener("hashchange", show); show();
