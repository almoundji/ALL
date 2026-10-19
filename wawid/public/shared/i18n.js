// WawID — bilinguisme français / anglais.
// L'interface est écrite en français ; en anglais, chaque texte affiché (nœuds texte, attributs title / placeholder /
// aria-label, infobulles, messages du serveur) est traduit à la volée à partir du dictionnaire shared/i18n/en.json :
//   - clés exactes : « Contrôle guichet » → « Counter check » ;
//   - clés à paramètres : « Bonjour {0} » → « Hello {0} » (les valeurs capturées sont elles-mêmes traduites si possible).
// Un MutationObserver traduit tout ce que les vues insèrent, sans modifier leur code.

const KEY = "wawid:lang";
const SKIP = new Set(["SCRIPT", "STYLE", "TEXTAREA", "CODE", "PRE", "KBD"]);
const ATTRS = ["title", "placeholder", "aria-label", "data-tip-title"];

export function lang() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "fr" || saved === "en") return saved;
  } catch {}
  return (navigator.language || "fr").toLowerCase().startsWith("fr") ? "fr" : "en";
}
export const locale = () => (lang() === "en" ? "en-GB" : "fr-FR");

export function setLang(l) {
  try { localStorage.setItem(KEY, l); } catch {}
  location.reload();
}

let exact = new Map();
let patterns = []; // { re, en, prefix }

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function compile(dict) {
  exact = new Map();
  patterns = [];
  for (const [fr, en] of Object.entries(dict)) {
    if (!en || (en === fr && !/\{\d+\}/.test(fr))) continue;
    if (/\{\d+\}/.test(fr)) {
      const parts = fr.split(/\{(\d+)\}/);
      let src = "^", order = [];
      parts.forEach((p, i) => { if (i % 2) { src += "(.+?)"; order.push(Number(p)); } else src += escapeRe(p); });
      patterns.push({ re: new RegExp(src + "$", "s"), en, order, prefix: parts[0].slice(0, 3) });
    } else exact.set(fr, en);
  }
  // Les motifs les plus longs (plus spécifiques) d'abord.
  patterns.sort((a, b) => b.re.source.length - a.re.source.length);
}

/** Traduit une chaîne (identité en français ou si inconnue). */
export function t(s, depth = 0) {
  if (lang() !== "en" || !s) return s;
  const core = s.trim();
  if (!core) return s;
  const lead = s.slice(0, s.indexOf(core[0])), trail = s.slice(s.lastIndexOf(core[core.length - 1]) + 1);
  const hit = exact.get(core);
  if (hit !== undefined) return lead + hit + trail;
  if (depth < 3) {
    // Listes « A · B » : chaque élément est traduit séparément (avant les motifs, trop gourmands).
    if (core.includes(" · ")) {
      const segs = core.split(" · ");
      const tr = segs.map((x) => t(x, depth + 1));
      if (tr.some((x, i) => x !== segs[i])) return lead + tr.join(" · ") + trail;
    }
    for (const p of patterns) {
      if (p.prefix && !core.startsWith(p.prefix)) continue;
      const m = p.re.exec(core);
      if (!m) continue;
      let out = p.en;
      p.order.forEach((n, i) => { out = out.replace(`{${n}}`, t(m[i + 1], depth + 1)); });
      return lead + out + trail;
    }
    // Ponctuation finale (« Autorisé · », « Total : ») : on traduit le cœur.
    const punct = /^(.*?)(\s*[·:—,]\s*)$/s.exec(core);
    if (punct && punct[1]) { const c2 = t(punct[1], depth + 1); if (c2 !== punct[1]) return lead + c2 + punct[2] + trail; }
    // Segments séparés par « · » ou « — » traduits un à un.
    for (const sep of [" · ", " — ", " : "]) {
      if (core.includes(sep)) {
        const segs = core.split(sep);
        const tr = segs.map((x) => t(x, depth + 1));
        if (tr.some((x, i) => x !== segs[i])) return lead + tr.join(sep) + trail;
      }
    }
  }
  return s;
}

function translateNode(node) {
  if (node.nodeType === 3) {
    const p = node.parentNode;
    if (!p || SKIP.has(p.nodeName) || p.closest?.("[data-no-i18n], .mono")) return;
    const v = node.nodeValue;
    if (!/[A-Za-zÀ-ÿ]/.test(v)) return;
    const tr = t(v);
    if (tr !== v) node.nodeValue = tr;
    return;
  }
  if (node.nodeType !== 1 || SKIP.has(node.nodeName) || node.hasAttribute?.("data-no-i18n")) return;
  for (const a of ATTRS) {
    const v = node.getAttribute(a);
    if (v) { const tr = t(v); if (tr !== v) node.setAttribute(a, tr); }
  }
  if (node.nodeName === "OPTION" || node.childNodes.length) node.childNodes.forEach(translateNode);
}

/** Charge le dictionnaire et traduit la page en continu (à appeler avant le premier rendu). */
export async function initI18n(base = "") {
  document.documentElement.lang = lang();
  if (lang() !== "en") return;
  try {
    const res = await fetch(`${base}shared/i18n/en.json?v=1`);
    compile(await res.json());
  } catch { return; }
  const run = (nodes) => nodes.forEach(translateNode);
  new MutationObserver((muts) => {
    for (const m of muts) {
      if (m.type === "characterData") translateNode(m.target);
      else if (m.type === "attributes") translateNode(m.target);
      else run(m.addedNodes);
    }
  }).observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  run([document.documentElement]);
  document.title = t(document.title);
}

/** Sélecteur de langue (bouton FR | EN). */
export const langSwitch = (cls = "") => `<span class="lang-switch ${cls}" data-no-i18n role="group" aria-label="Langue / Language">${["fr", "en"].map((l) => `<button type="button" data-lang="${l}" aria-pressed="${lang() === l}">${l.toUpperCase()}</button>`).join("")}</span>`;
export function bindLangSwitch(scope = document) {
  scope.querySelectorAll("[data-lang]").forEach((b) => (b.onclick = () => { if (b.dataset.lang !== lang()) setLang(b.dataset.lang); }));
}
