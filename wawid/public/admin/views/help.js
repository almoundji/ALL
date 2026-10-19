// Centre d'aide intégré : documentation bilingue (sommaire, recherche plein texte, sommaire de page).
import { lang } from "../../shared/i18n.js";
import { renderMarkdown } from "../../shared/markdown.js";
import { api, esc, icon } from "../../shared/ui.js";
import { pageHead } from "./common.js";

let cache = null;
async function loadAll() {
  if (cache && cache.lang === lang()) return cache;
  const { sections } = await api("/api/docs");
  const pages = sections.flatMap((s) => s.pages);
  const content = Object.fromEntries(await Promise.all(pages.map(async (p) => [p.slug, (await api(`/api/docs/${lang()}/${p.slug}`)).markdown])));
  cache = { lang: lang(), sections, pages, content };
  return cache;
}

/** Page de documentation correspondant à une route du back-office (aide contextuelle). */
export async function slugForRoute(section) {
  const { pages } = await loadAll();
  return pages.find((p) => (p.routes || []).includes(section || ""))?.slug || "demarrage";
}

export async function render(el, _ctx, _rest, query) {
  const { sections, pages, content } = await loadAll();
  const L = lang();
  const slug = pages.some((p) => p.slug === query.page) ? query.page : "demarrage";
  const q = (query.q || "").trim();
  const { html, toc } = renderMarkdown(content[slug]);
  const results = q.length >= 2 ? pages.map((p) => {
    const text = content[p.slug];
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    return idx < 0 ? null : { p, excerpt: text.slice(Math.max(0, idx - 70), idx + 110).replace(/[#*`|>]/g, " ") };
  }).filter(Boolean) : null;
  el.innerHTML = `${pageHead({ title: L === "en" ? "Help center" : "Centre d'aide", sub: L === "en" ? "Complete WawID documentation, in English and French." : "Documentation complète de WawID, en français et en anglais.", crumbs: [[null, L === "en" ? "Help" : "Aide"]],
    actions: `<a class="btn" href="../aide/" target="_blank">${icon("globe")} ${L === "en" ? "Public help" : "Aide publique"}</a><button class="btn" onclick="print()">${icon("printer")} ${L === "en" ? "Print" : "Imprimer"}</button>` })}
  <div class="help-layout" data-no-i18n>
    <aside class="card help-nav">
      <form id="hs" class="help-search">${icon("search")}<input name="q" value="${esc(q)}" placeholder="${L === "en" ? "Search the documentation…" : "Rechercher dans la documentation…"}"></form>
      ${sections.map((s) => `<div class="help-group">${esc(s.group[L])}</div>${s.pages.map((p) => `<a href="#/aide?page=${p.slug}" class="${p.slug === slug && !results ? "on" : ""}">${esc(p[L])}${p.public ? "" : ` <span class="help-lock" title="${L === "en" ? "Internal" : "Interne"}">${icon("lock")}</span>`}</a>`).join("")}`).join("")}
    </aside>
    <article class="card help-doc">
      ${results ? `<h1>${L === "en" ? "Search results" : "Résultats de recherche"} : « ${esc(q)} »</h1>${results.length ? results.map((r) => `<a class="help-hit" href="#/aide?page=${r.p.slug}"><b>${esc(r.p[L])}</b><span>…${esc(r.excerpt)}…</span></a>`).join("") : `<p class="muted">${L === "en" ? "No results." : "Aucun résultat."}</p>`}`
        : `${toc.length > 2 ? `<nav class="help-toc"><b>${L === "en" ? "On this page" : "Sur cette page"}</b>${toc.map((h) => `<a href="#/aide?page=${slug}" data-anchor="${h.id}" class="lvl${h.level}">${esc(h.text)}</a>`).join("")}</nav>` : ""}<div class="md">${html}</div>`}
    </article>
  </div>`;
  el.querySelector("#hs").onsubmit = (e) => { e.preventDefault(); location.hash = `#/aide?q=${encodeURIComponent(new FormData(e.target).get("q"))}`; };
  el.querySelectorAll("[data-anchor]").forEach((a) => (a.onclick = (e) => { e.preventDefault(); el.querySelector(`#${CSS.escape(a.dataset.anchor)}`)?.scrollIntoView({ behavior: "smooth", block: "start" }); }));
}
