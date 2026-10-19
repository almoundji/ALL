// Centre d'aide public : pages de documentation accessibles sans connexion (voyageurs, compagnies, kiosques).
import { bindLangSwitch, initI18n, lang, langSwitch } from "../shared/i18n.js";
import { renderMarkdown } from "../shared/markdown.js";
import { LOGO, WORDMARK, api, esc, icon, initTheme } from "../shared/ui.js";

initTheme();
const app = document.getElementById("app");

async function render() {
  const L = lang();
  const { sections, internal } = await api("/api/docs");
  const pages = sections.flatMap((s) => s.pages);
  const slug = pages.some((p) => p.slug === location.hash.slice(1)) ? location.hash.slice(1) : pages[0].slug;
  const doc = await api(`/api/docs/${L}/${slug}`);
  const { html, toc } = renderMarkdown(doc.markdown);
  document.title = `${doc.title} · WawID`;
  app.innerHTML = `
  <header class="p-nav"><nav class="p-nav-bar">
    <a class="brand" href="../"><span class="brand-logo">${LOGO}</span><span><span class="brand-name">${WORDMARK}</span><br><span class="brand-sub">${L === "en" ? "Help center" : "Centre d'aide"}</span></span></a>
    <div class="p-links"><a href="../">${L === "en" ? "Traveler portal" : "Portail voyageur"}</a><a href="../admin/">${L === "en" ? "Officer space" : "Espace agents"}</a></div>
    ${langSwitch()}
  </nav></header>
  <main class="p-main">
    <div class="help-layout" data-no-i18n>
      <aside class="card help-nav">
        ${sections.map((s) => `<div class="help-group">${esc(s.group[L])}</div>${s.pages.map((p) => `<a href="#${p.slug}" class="${p.slug === slug ? "on" : ""}">${esc(p[L])}</a>`).join("")}`).join("")}
        ${internal ? "" : `<p class="small muted" style="margin:14px 8px 0">${icon("lock")} ${L === "en" ? "Officers: sign in to the back office for the full documentation." : "Agents : connectez-vous au back-office pour la documentation complète."}</p>`}
      </aside>
      <article class="card help-doc">${toc.length > 2 ? `<nav class="help-toc"><b>${L === "en" ? "On this page" : "Sur cette page"}</b>${toc.map((h) => `<a href="#${slug}" data-anchor="${h.id}" class="lvl${h.level}">${esc(h.text)}</a>`).join("")}</nav>` : ""}<div class="md">${html}</div></article>
    </div>
  </main>`;
  bindLangSwitch(app);
  app.querySelectorAll("[data-anchor]").forEach((a) => (a.onclick = (e) => { e.preventDefault(); document.getElementById(a.dataset.anchor)?.scrollIntoView({ behavior: "smooth" }); }));
  scrollTo(0, 0);
}

initI18n("../").then(render);
addEventListener("hashchange", render);
