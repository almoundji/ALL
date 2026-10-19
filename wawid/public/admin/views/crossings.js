// Passages : List Report (filtres, tri, export), Object Page et recherche voyageur 360° (résolution d'identité).
import { locale } from "../../shared/i18n.js";
import { nameSimilarity, normName } from "../../shared/engine.js";
import { api, country, downloadCSV, esc, fmtDate, fmtDateTime, fmtPct, icon, riskBadge, status, toast } from "../../shared/ui.js";
import { mountTable, pageHead } from "./common.js";
import { riskPanel } from "./control.js";

export function render(el, ctx, rest, query) {
  if (rest[0]) return renderObject(el, ctx, rest[0]);
  const d = ctx.data;
  const f = { q: query.q || "", poste: query.poste || "", decision: "", level: "", channel: "", direction: "", period: ["1", "7", "14"].includes(query.periode) ? query.periode : "14", fraud: query.fraude === "1" };
  el.innerHTML = `${pageHead({ title: "Passages", sub: "Tous les franchissements enregistrés aux guichets, eGates et kiosques ABC.", crumbs: [[null, "Contrôle frontière"]],
    actions: `<button class="btn" id="csv">${icon("download")} Exporter CSV</button>` })}
  <div class="card filterbar">
    <label class="field" style="max-width:none;flex:2"><span>Recherche</span><input class="input" data-f="q" value="${esc(f.q)}" placeholder="Nom, n° de document, vol…"></label>
    <label class="field"><span>Poste</span><select class="select" data-f="poste"><option value="">Tous</option>${d.postes.map((p) => `<option value="${p.id}" ${p.id === f.poste ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select></label>
    <label class="field"><span>Sens</span><select class="select" data-f="direction"><option value="">Tous</option><option value="ENTREE">Entrée</option><option value="SORTIE">Sortie</option></select></label>
    <label class="field"><span>Canal</span><select class="select" data-f="channel"><option value="">Tous</option><option value="GUICHET">Guichet</option><option value="EGATE">eGate / ABC</option></select></label>
    <label class="field"><span>Décision</span><select class="select" data-f="decision"><option value="">Toutes</option><option value="AUTORISE">Autorisé</option><option value="SECONDAIRE">Contrôle secondaire</option><option value="REFUSE">Refusé</option></select></label>
    <label class="field"><span>Risque</span><select class="select" data-f="level"><option value="">Tous</option><option value="FAIBLE">Faible</option><option value="MODERE">Modéré</option><option value="ELEVE">Élevé</option></select></label>
    <label class="field"><span>Période</span><select class="select" data-f="period">${[["1", "24 h"], ["7", "7 jours"], ["14", "14 jours"]].map(([v, l]) => `<option value="${v}" ${f.period === v ? "selected" : ""}>${l}</option>`).join("")}</select></label>
    <label class="check" style="align-self:center"><input type="checkbox" data-f="fraud" ${f.fraud ? "checked" : ""}> Suspicion de fraude</label>
  </div>
  <section class="card"><div class="toolbar"><h3 id="count"></h3></div><div id="table"></div></section>`;

  const filtered = () => {
    const q = normName(f.q);
    const since = Date.now() - Number(f.period) * 86400000;
    return d.crossings.filter((c) => Date.parse(c.ts) >= since && (!f.poste || c.posteId === f.poste) && (!f.decision || c.decision === f.decision) &&
      (!f.level || c.risk.level === f.level) && (!f.channel || c.channel === f.channel) && (!f.direction || c.direction === f.direction) && (!f.fraud || c.risk.fraud) &&
      (!q || normName(`${c.traveler.surname} ${c.traveler.given} ${c.traveler.docNo} ${c.flight || ""} ${c.id}`).includes(q)));
  };
  const table = mountTable(el.querySelector("#table"), {
    rows: filtered(), onRow: (c) => (location.hash = `#/passages/${c.id}`), sort: "ts",
    columns: [
      { key: "ts", label: "Date / heure", render: (c) => `<span class="nowrap">${fmtDateTime(c.ts)}</span>` },
      { key: "traveler", label: "Voyageur", value: (c) => c.traveler.surname, render: (c) => `<div class="cell-title">${esc(c.traveler.surname)} ${esc(c.traveler.given)}</div><div class="cell-sub">${esc(country(c.traveler.nat))}</div>` },
      { key: "doc", label: "Document", value: (c) => c.traveler.docNo, render: (c) => `<span class="mono">${esc(c.traveler.docNo)}</span>` },
      { key: "posteId", label: "Poste", render: (c) => `${esc(ctx.poste(c.posteId))}<div class="cell-sub">${c.channel === "EGATE" ? `eGate ${esc(c.gateId)}` : "Guichet"}${c.flight ? ` · ${esc(c.flight)}` : ""}</div>` },
      { key: "direction", label: "Sens", render: (c) => (c.direction === "ENTREE" ? "Entrée" : "Sortie") },
      { key: "risk", label: "Risque", value: (c) => c.risk.score, render: (c) => riskBadge(c.risk.score, c.risk.level) + (c.risk.fraud ? ` <span class="status critical" title="Suspicion de fraude">Fraude</span>` : "") },
      { key: "decision", label: "Décision", render: (c) => status("decision", c.decision) },
      { key: "agent", label: "Agent", render: (c) => `<span class="small">${esc(c.agent)}</span>` },
    ],
  });
  const refresh = () => { const r = filtered(); el.querySelector("#count").textContent = `Passages (${r.length.toLocaleString(locale())})`; table.update(r); };
  el.querySelectorAll("[data-f]").forEach((i) => (i.oninput = i.onchange = () => { f[i.dataset.f] = i.type === "checkbox" ? i.checked : i.value; refresh(); }));
  el.querySelector("#csv").onclick = () => downloadCSV("wawid-passages.csv", filtered().map((c) => ({
    Id: c.id, Date: c.ts, Poste: ctx.poste(c.posteId), Canal: c.channel, eGate: c.gateId || "", Sens: c.direction, Nom: c.traveler.surname, Prénoms: c.traveler.given,
    Nationalité: c.traveler.nat, Document: c.traveler.docNo, Vol: c.flight || "", Score: c.risk.score, Fraude: c.risk.fraud ? "oui" : "non", Décision: c.decision, Motif: c.reason || "", Agent: c.agent,
  })));
  refresh();
}

function renderObject(el, ctx, id) {
  const c = ctx.data.crossings.find((x) => x.id === id);
  if (!c) { el.innerHTML = `<div class="card empty">Passage introuvable.</div>`; return; }
  const t = c.traveler;
  const others = ctx.data.crossings.filter((x) => x.traveler.docNo === t.docNo && x.id !== c.id);
  const alerts = ctx.data.alerts.filter((a) => a.crossingId === c.id);
  const audit = [{ at: c.ts, text: `${c.channel === "EGATE" ? "eGate " + c.gateId : "Guichet"} — ${c.agent}` }, ...alerts.flatMap((a) => a.history.map((h) => ({ at: h.at, text: `${a.id} : ${h.text} (${h.by})` })))];
  el.innerHTML = `${pageHead({ title: "", crumbs: [["#/passages", "Passages"], [null, c.id]] }).replace("<h1></h1>", "")}
  <section class="card">
    <div class="object-head">
      <div class="object-avatar">${esc(t.surname[0])}${esc(t.given[0] || "")}</div>
      <div><h1>${esc(t.surname)} ${esc(t.given)}</h1><div class="muted">${esc(t.docType || "Passeport")} <span class="mono">${esc(t.docNo)}</span> · ${esc(country(t.nat))} · né(e) le ${fmtDate(t.dob)}</div>
        <div class="row" style="margin-top:8px">${status("decision", c.decision)}${c.risk.fraud ? '<span class="status critical">Suspicion de fraude</span>' : ""}<span class="status">${c.direction === "ENTREE" ? "Entrée" : "Sortie"}</span><span class="status">${c.channel === "EGATE" ? "eGate / ABC" : "Guichet"}</span></div></div>
      <div class="object-kpis"><div><span>Score de risque</span><b>${c.risk.score} / 100</b></div><div><span>Visage</span><b>${c.biometrics.face != null ? fmtPct(c.biometrics.face) : "—"}</b></div><div><span>Passages connus</span><b>${others.length + 1}</b></div></div>
    </div>
    <nav class="anchor-bar"><a href="#/passages/${c.id}" data-a="gen">Informations</a><a href="#/passages/${c.id}" data-a="risk">Évaluation du risque</a><a href="#/passages/${c.id}" data-a="hist">Historique du voyageur</a><a href="#/passages/${c.id}" data-a="log">Journal</a></nav>
  </section>
  <div class="row no-print" style="margin:14px 0">
    ${ctx.can("cases") ? `<button class="btn" id="case">${icon("briefcase")} Ouvrir un dossier</button>` : ""}
    ${ctx.can("watchlist") ? `<button class="btn" id="poi">${icon("target")} Ajouter comme personne d'intérêt</button>` : ""}
    <a class="btn" href="#/voyageurs?q=${encodeURIComponent(t.docNo)}">${icon("user")} Profil 360°</a>
    <button class="btn" onclick="print()">${icon("printer")} Imprimer</button>
  </div>
  <div class="grid-main">
    <div class="stack">
      <section class="card" id="gen"><div class="card-head"><h3>Informations générales</h3></div><div class="card-body grid-2">
        <dl class="kv"><dt>Date</dt><dd>${fmtDateTime(c.ts)}</dd><dt>Poste</dt><dd>${esc(ctx.poste(c.posteId))}</dd><dt>Canal</dt><dd>${c.channel === "EGATE" ? `eGate ${esc(c.gateId)}` : "Guichet"}</dd><dt>Vol / provenance</dt><dd>${esc(c.flight || "—")} ${c.origin ? `· ${esc(c.origin)}` : ""}</dd><dt>Agent</dt><dd>${esc(c.agent)}</dd><dt>Durée</dt><dd>${c.durationSec} s</dd></dl>
        <dl class="kv"><dt>Correspondance faciale</dt><dd>${c.biometrics.face != null ? fmtPct(c.biometrics.face) : "—"}</dd><dt>Détection du vivant</dt><dd>${c.biometrics.liveness ? "Réussie" : '<span class="status critical">Échec</span>'}</dd><dt>Empreintes</dt><dd>${c.biometrics.fingerprints} / 4</dd><dt>Iris</dt><dd>${c.biometrics.iris ? fmtPct(c.biometrics.iris) : "—"}</dd><dt>Puce (NFC)</dt><dd>${c.biometrics.chip ? (c.biometrics.chip.read ? `${c.biometrics.chip.passiveAuth === false ? '<span class="status critical">Authentification passive échouée</span>' : '<span class="status good">Authentifiée</span>'} <span class="small muted">${esc(c.biometrics.chip.protocol || "")}${c.biometrics.chip.source === "simulation" ? " · simulé" : ""}</span>` : "Non lue") : "—"}</dd><dt>Expiration doc.</dt><dd>${fmtDate(t.expiry)}</dd><dt>Motif</dt><dd>${esc(c.reason || "—")}</dd></dl>
      </div>${c.notes ? `<div class="card-body" style="border-top:1px solid var(--line)"><span class="label">Observations</span><p>${esc(c.notes)}</p></div>` : ""}</section>
      <section class="card" id="hist"><div class="card-head"><h3>Historique du voyageur (${others.length})</h3></div><div class="table-wrap"><table class="table"><tbody>
        ${others.slice(0, 20).map((o) => `<tr class="clickable" data-id="${o.id}"><td class="nowrap">${fmtDateTime(o.ts)}</td><td>${o.direction === "ENTREE" ? "Entrée" : "Sortie"}</td><td>${esc(ctx.poste(o.posteId))}</td><td>${riskBadge(o.risk.score, o.risk.level)}</td><td>${status("decision", o.decision)}</td></tr>`).join("") || `<tr><td class="empty">Premier passage connu</td></tr>`}
      </tbody></table></div></section>
      <section class="card" id="log"><div class="card-head"><h3>Journal</h3></div><div class="card-body timeline">${audit.map((a) => `<div><b>${fmtDateTime(a.at)}</b><br>${esc(a.text)}</div>`).join("")}</div></section>
    </div>
    <section class="card" id="risk"><div class="card-head"><h3>Évaluation du risque</h3></div><div class="card-body">${riskPanel({ ...c.risk, tone: { FAIBLE: "good", MODERE: "warning", ELEVE: "critical" }[c.risk.level], recommendation: c.risk.score >= 80 ? "REFUSE" : c.risk.score >= 30 ? "SECONDAIRE" : "AUTORISE" })}</div></section>
  </div>`;
  el.querySelectorAll("[data-a]").forEach((a) => (a.onclick = (e) => { e.preventDefault(); el.querySelector(`#${a.dataset.a}`).scrollIntoView({ behavior: "smooth", block: "start" }); }));
  el.querySelectorAll("tr[data-id]").forEach((tr) => (tr.onclick = () => (location.hash = `#/passages/${tr.dataset.id}`)));
  el.querySelector("#case")?.addEventListener("click", async () => {
    try {
      const d = await api("/api/cases", { method: "POST", body: { alertId: alerts[0]?.id, crossingId: c.id, traveler: `${t.surname} ${t.given}`, title: alerts[0]?.title || `Contrôle secondaire — ${t.surname}` } });
      await ctx.reload(); toast(`Dossier ${d.id} ouvert`); location.hash = `#/dossiers/${d.id}`;
    } catch (e) { toast(e.message, "critical"); }
  });
  el.querySelector("#poi")?.addEventListener("click", async () => {
    try {
      await api("/api/watchlist", { method: "POST", body: { kind: "person", source: "POI", list: "Personne d'intérêt", surname: t.surname, given: t.given, dob: t.dob, nat: t.nat, severity: "moyenne", reason: `Signalé depuis le passage ${c.id}`, reference: c.id } });
      await ctx.reload(); toast("Ajouté à la liste des personnes d'intérêt");
    } catch (e) { toast(e.message, "critical"); }
  });
}

/** Recherche voyageur 360° : regroupe les passages, demandes e-Visa, APIS et signalements d'une même identité. */
export function renderSearch(el, ctx, _rest, query) {
  const q = query.q || "";
  el.innerHTML = `${pageHead({ title: "Recherche voyageur", sub: "Résolution d'identité : documents, noms approchés (translittérations, inversions) et date de naissance.", crumbs: [[null, "Contrôle frontière"]] })}
  <form class="card filterbar" id="f"><label class="field" style="max-width:none;flex:1"><span>Nom, prénoms ou n° de document</span><input class="input" name="q" value="${esc(q)}" autofocus></label><button class="btn btn-primary">${icon("search")} Rechercher</button></form>
  <div id="res"></div>`;
  el.querySelector("#f").onsubmit = (e) => { e.preventDefault(); location.hash = `#/voyageurs?q=${encodeURIComponent(new FormData(e.target).get("q"))}`; };
  if (!q.trim()) return;
  const d = ctx.data;
  const nq = normName(q);
  // Regroupement par identité : même n° de document, ou même nom approché + même date de naissance.
  const groups = [];
  for (const c of d.crossings) {
    const t = c.traveler;
    const full = `${t.surname} ${t.given}`;
    if (!(normName(t.docNo) === nq || nameSimilarity(full, q) >= 0.86 || normName(full).includes(nq))) continue;
    let g = groups.find((x) => x.docs.has(t.docNo) || (x.dob === t.dob && nameSimilarity(x.name, full) >= 0.9));
    if (!g) { g = { name: full, dob: t.dob, nat: t.nat, docs: new Set(), crossings: [] }; groups.push(g); }
    g.docs.add(t.docNo); g.crossings.push(c);
  }
  for (const v of d.evisas) {
    const full = `${v.applicant.surname} ${v.applicant.given}`;
    if (!(normName(v.applicant.docNo) === nq || nameSimilarity(full, q) >= 0.86)) continue;
    let g = groups.find((x) => x.docs.has(v.applicant.docNo));
    if (!g) { g = { name: full, dob: v.applicant.dob, nat: v.applicant.nat, docs: new Set([v.applicant.docNo]), crossings: [] }; groups.push(g); }
    (g.evisas ||= []).push(v);
  }
  const wl = d.watchlist.filter((w) => w.active && ((w.docNo && normName(w.docNo) === nq) || (w.surname && nameSimilarity(`${w.surname} ${w.given}`, q) >= 0.86)));
  const apis = d.flights.flatMap((f) => f.passengers.filter((p) => normName(p.docNo) === nq || nameSimilarity(`${p.surname} ${p.given}`, q) >= 0.86).map((p) => ({ f, p })));
  el.querySelector("#res").innerHTML = `
    ${wl.length ? `<div class="msg critical" style="margin-bottom:14px">${icon("shieldAlert")}<span><b>${wl.length} correspondance(s) en liste de surveillance :</b> ${wl.map((w) => `${esc(w.list)} — ${esc(w.surname || w.docNo)} ${esc(w.given || "")} (${esc(w.reference)})`).join(" ; ")}</span></div>` : ""}
    ${groups.length ? groups.map((g) => `<section class="card" style="margin-bottom:14px"><div class="card-head"><div class="object-avatar" style="width:44px;height:44px;font-size:16px;border-radius:12px">${esc(g.name[0])}</div><div><h3>${esc(g.name)}</h3><div class="small muted">${esc(country(g.nat))} · né(e) le ${fmtDate(g.dob)} · documents : ${[...g.docs].map((x) => `<span class="mono">${esc(x)}</span>`).join(", ")}</div></div>
      <div class="row" style="margin-left:auto">${g.docs.size > 1 ? '<span class="status warning">Plusieurs documents</span>' : ""}<span class="status">${g.crossings.length} passage(s)</span>${g.evisas ? `<span class="status info">${g.evisas.length} e-Visa</span>` : ""}</div></div>
      <div class="table-wrap"><table class="table"><tbody>${g.crossings.slice(0, 12).map((c) => `<tr class="clickable" data-id="${c.id}"><td class="nowrap">${fmtDateTime(c.ts)}</td><td>${c.direction === "ENTREE" ? "Entrée" : "Sortie"}</td><td>${esc(ctx.poste(c.posteId))}</td><td class="mono">${esc(c.traveler.docNo)}</td><td>${riskBadge(c.risk.score, c.risk.level)}</td><td>${status("decision", c.decision)}</td></tr>`).join("")}
      ${(g.evisas || []).map((v) => `<tr class="clickable" data-ev="${v.ref}"><td class="nowrap">${fmtDateTime(v.createdAt)}</td><td>e-Visa</td><td>${esc(v.trip.purpose)}</td><td class="mono">${esc(v.ref)}</td><td></td><td>${status("evisa", v.status)}</td></tr>`).join("")}</tbody></table></div></section>`).join("") : ""}
    ${apis.length ? `<section class="card"><div class="card-head"><h3>Annoncé sur des vols (APIS)</h3></div><div class="table-wrap"><table class="table"><tbody>${apis.map(({ f, p }) => `<tr><td>${esc(f.flight)}</td><td>${esc(f.route)}</td><td>${fmtDateTime(f.eta)}</td><td>${riskBadge(p.score, p.level)}</td></tr>`).join("")}</tbody></table></div></section>` : ""}
    ${!groups.length && !wl.length && !apis.length ? `<div class="card empty">Aucun résultat pour « ${esc(q)} ».</div>` : ""}`;
  el.querySelectorAll("[data-id]").forEach((tr) => (tr.onclick = () => (location.hash = `#/passages/${tr.dataset.id}`)));
  el.querySelectorAll("[data-ev]").forEach((tr) => (tr.onclick = () => (location.hash = `#/evisa/${tr.dataset.ev}`)));
}
