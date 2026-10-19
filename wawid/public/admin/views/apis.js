// APIS Monitor / Manager / Gateway : passerelle API (PAXLST) et PNR des compagnies aériennes,
// pré-contrôle des passagers, journal des messages et conformité des transporteurs.
import { api, country, dialog, esc, fmtDateTime, fmtNum, fmtTime, icon, riskBadge, toast } from "../../shared/ui.js";
import { mountTable, pageHead } from "./common.js";

const SAMPLE_CSV = `siege;nom;prenoms;naissance;nationalite;document;expiration
1A;Ndiaye;Fatou;1990-02-11;SEN;A07711223;2030-01-01
1B;Kabore;Issouf Malick;1981-04-12;BFA;BF7712093;2029-02-01
2A;Wang;Lei;1985-03-09;CHN;E81234567;2030-08-01
2B;Martin;Claire;1978-12-24;FRA;21CX88341;2031-05-30`;

export function render(el, ctx, _rest, query) {
  const tab = query.tab || "vols";
  const d = ctx.data;
  const flights = [...d.flights].sort((a, b) => a.eta.localeCompare(b.eta));
  const current = flights.find((f) => f.id === query.id);
  el.innerHTML = `${pageHead({ title: "APIS Monitor", sub: "Guichet unique API / PNR : chaque passager annoncé est confronté aux listes de surveillance, aux règles de ciblage et aux autorisations de voyage avant l'arrivée ou le départ.", crumbs: [[null, "APIS & PNR"]],
    actions: ctx.can("apis") ? `<button class="btn" id="upload">${icon("upload")} Manifeste CSV</button><button class="btn btn-primary" id="send">${icon("plane")} Recevoir un message API / PNR</button>` : "" })}
  <nav class="space-tabs"><button aria-selected="${tab === "vols"}" data-tab="vols">Vols annoncés (${flights.length})</button><button aria-selected="${tab === "passerelle"}" data-tab="passerelle">Passerelle transporteurs (${(d.carrierMessages || []).length})</button><button aria-selected="${tab === "conformite"}" data-tab="conformite">Conformité transporteurs</button></nav>
  <div id="body"></div>`;
  el.querySelectorAll("[data-tab]").forEach((b) => (b.onclick = () => (location.hash = `#/apis?tab=${b.dataset.tab}`)));
  el.querySelector("#upload")?.addEventListener("click", () => upload(ctx));
  el.querySelector("#send")?.addEventListener("click", () => sendMessage(ctx));
  const body = el.querySelector("#body");
  if (tab === "conformite") return compliance(body, flights, d.carrierMessages || []);
  if (query.send && ctx.can("apis")) setTimeout(() => sendMessage(ctx), 0);
  if (tab === "passerelle") return gateway(body, d.carrierMessages || []);

  body.innerHTML = `<div class="grid-main" style="grid-template-columns:${current ? "minmax(0,1fr) minmax(0,1.4fr)" : "1fr"}"><section class="card" id="fl"></section>${current ? `<section class="card" id="mf"></section>` : ""}</div>`;
  mountTable(body.querySelector("#fl"), {
    rows: flights, onRow: (f) => (location.hash = `#/apis?id=${f.id}`),
    columns: [
      { key: "flight", label: "Vol", render: (f) => `<div class="cell-title">${esc(f.flight)}</div><div class="cell-sub">${esc(f.carrier)}</div>` },
      { key: "route", label: "Trajet", render: (f) => `${esc(f.route)}<div class="cell-sub">${f.direction === "ARRIVEE" ? "Arrivée" : "Départ"}</div>` },
      { key: "eta", label: "Horaire", render: (f) => `${fmtTime(f.eta)}<div class="cell-sub">${fmtDateTime(f.eta)}</div>` },
      { key: "pax", label: "Passagers", num: true, value: (f) => f.passengers.length, render: (f) => fmtNum(f.passengers.length) },
      { key: "hits", label: "Signalés", num: true, value: (f) => f.passengers.filter((p) => p.score >= 30).length, render: (f) => { const n = f.passengers.filter((p) => p.score >= 30).length; return n ? `<span class="status critical">${n}</span>` : '<span class="status good">0</span>'; } },
    ],
  });
  if (current) {
    const mf = body.querySelector("#mf");
    mf.innerHTML = `<div class="card-head"><div class="grow"><h3>${esc(current.flight)} · ${esc(current.route)}</h3><div class="small muted">${esc(current.source)} · reçu ${fmtDateTime(current.receivedAt)}${current.onTime === false ? ' · <span class="status warning">transmission tardive</span>' : ""}</div></div></div><div id="pax"></div>`;
    mountTable(mf.querySelector("#pax"), {
      rows: current.passengers, sort: "score", pageSize: 100, onRow: (p) => passengerDialog(p, current),
      columns: [
        { key: "seat", label: "Siège" },
        { key: "surname", label: "Passager", render: (p) => `<div class="cell-title">${esc(p.surname)} ${esc(p.given)}</div><div class="cell-sub">${esc(country(p.nat))} · <span class="mono">${esc(p.docNo || "sans document")}</span></div>` },
        { key: "pnr", label: "Réservation", render: (p) => (p.pnr ? `<span class="mono">${esc(p.pnr)}</span><div class="cell-sub">${esc([p.payment, p.oneWay ? "aller simple" : "", p.phone ? "tél." : "", p.email ? "e-mail" : ""].filter(Boolean).join(" · "))}</div>` : '<span class="muted">—</span>') },
        { key: "score", label: "Pré-contrôle", value: (p) => p.score, render: (p) => riskBadge(p.score, p.level) },
        { key: "factors", label: "Motifs", sortable: false, render: (p) => `<span class="small">${esc(p.factors.filter((f) => f.points >= 10).map((f) => f.label).join(" · ") || "—")}</span>` },
      ],
    });
  }
}

function passengerDialog(p, f) {
  dialog({
    title: `${p.surname} ${p.given}`, wide: true,
    body: `<div class="grid-2"><dl class="kv">
        <dt>Vol</dt><dd>${esc(f.flight)} · ${esc(f.route)}</dd><dt>Siège</dt><dd>${esc(p.seat || "—")}</dd>
        <dt>Document</dt><dd class="mono">${esc(p.docType || "P")} ${esc(p.docNo || "—")}</dd><dt>Émetteur</dt><dd>${esc(country(p.issuer || p.nat))}</dd>
        <dt>Naissance</dt><dd>${esc(p.dob || "—")}</dd><dt>Sexe</dt><dd>${esc(p.sex || "—")}</dd><dt>Nationalité</dt><dd>${esc(country(p.nat))}</dd><dt>Expiration</dt><dd>${esc(p.expiry || "—")}</dd>
        <dt>Embarquement</dt><dd>${esc(p.embark || "—")} → ${esc(p.debark || "—")}</dd>${p.crew ? "<dt>Équipage</dt><dd>Oui</dd>" : ""}
      </dl><dl class="kv">
        <dt>PNR</dt><dd class="mono">${esc(p.pnr || "—")}</dd><dt>Réservé le</dt><dd>${esc(p.bookedAt || "—")}</dd><dt>Paiement</dt><dd>${esc(p.payment || "—")}</dd>
        <dt>E-mail</dt><dd>${esc(p.email || "—")}</dd><dt>Téléphone</dt><dd>${esc(p.phone || "—")}</dd>
        <dt>Itinéraire</dt><dd>${(p.itinerary || []).map((x) => esc(x)).join("<br>") || "—"}</dd>
      </dl></div>
      <h4 style="margin:16px 0 4px">Pré-contrôle ${riskBadge(p.score ?? 0, p.level || "FAIBLE")}</h4>
      ${(p.factors || []).map((x) => `<div class="factor"><span><b>${esc(x.label)}</b>${x.detail ? `<br><span class="small muted">${esc(x.detail)}</span>` : ""}</span><b>+${x.points}</b></div>`).join("") || '<p class="muted small">Aucun facteur de risque.</p>'}`,
  });
}

function gateway(body, messages) {
  const endpoint = `${location.origin}/api/carrier/messages`;
  body.innerHTML = `<div class="grid-main">
    <section class="card" id="msgs"></section>
    <section class="card"><div class="card-head"><h3>${icon("link")} Raccordement des compagnies</h3></div><div class="card-body stack small">
      <div><span class="label">Point d'accès</span><div class="mono" style="overflow-wrap:anywhere">POST ${esc(endpoint)}</div></div>
      <div><span class="label">Authentification</span><div>En-tête <span class="mono">X-Carrier-Key</span> (une clé par compagnie, variable <span class="mono">WAWID_CARRIER_KEYS</span>, transport HTTPS).</div></div>
      <div><span class="label">Formats acceptés</span><div>API : UN/EDIFACT <b>PAXLST</b> D02B (passagers et équipage)<br>PNR : texte IATA (RLOC, segments, <b>SSR DOCS</b>, CTCE/CTCM, FP) — PNRGOV via convertisseur</div></div>
      <div><span class="label">Délais</span><div>API au plus tard à la fermeture des portes ; PNR à H-48 et H-24.</div></div>
      <div><span class="label">Réponse</span><div>202 + accusé (référence, passagers, signalés, complétude) ; 422 si rejet ; 401 si clé invalide.</div></div>
      <div class="msg info">${icon("file")}<span>Spécification complète pour les compagnies : <span class="mono">docs/API-TRANSPORTEURS.md</span></span></div>
    </div></section></div>`;
  mountTable(body.querySelector("#msgs"), {
    rows: messages, sort: "receivedAt", empty: "Aucun message reçu — utilisez « Recevoir un message API / PNR » pour un essai.",
    onRow: (m) => m.flightId && (location.hash = `#/apis?id=${m.flightId}`),
    columns: [
      { key: "receivedAt", label: "Reçu", render: (m) => `<span class="nowrap">${fmtDateTime(m.receivedAt)}</span>` },
      { key: "format", label: "Format", render: (m) => `<span class="status ${m.format === "PNR" ? "info" : "brand"}">${esc(m.format)}</span>` },
      { key: "flight", label: "Vol", render: (m) => `<b>${esc(m.flight || "—")}</b><div class="cell-sub">${esc(m.source)}</div>` },
      { key: "passengers", label: "Passagers", num: true },
      { key: "flagged", label: "Signalés", num: true, render: (m) => (m.flagged ? `<span class="status critical">${m.flagged}</span>` : "0") },
      { key: "completeness", label: "Complétude", num: true, render: (m) => `${m.completeness} %` },
      { key: "status", label: "Statut", render: (m) => `<span class="status ${m.status === "ACCEPTÉ" ? "good" : m.status === "REJETÉ" ? "critical" : "warning"}">${esc(m.status)}</span>${m.errors?.length ? `<div class="cell-sub">${esc(m.errors.slice(0, 2).join(" ; "))}</div>` : ""}` },
    ],
  });
}

async function sendMessage(ctx) {
  const samples = await api("/api/apis/samples");
  const { value, form } = await dialog({
    title: "Recevoir un message transporteur", wide: true,
    body: `<p class="muted small" style="margin-top:0">Dépôt manuel d'un message API (PAXLST) ou PNR — même traitement que la passerelle automatique.</p>
      <div class="row" style="margin-bottom:10px"><button type="button" class="btn btn-sm" data-s="PAXLST">${icon("file")} Exemple PAXLST</button><button type="button" class="btn btn-sm" data-s="PNR">${icon("file")} Exemple PNR</button></div>
      <textarea class="textarea mono" name="message" style="min-height:300px;font-size:12px" placeholder="UNA:+.? '…  ou  RLOC ABC123 …"></textarea>`,
    actions: [{ label: "Annuler", value: null }, { label: "Traiter le message", cls: "btn-primary", value: "ok", validate: (f) => (!f.message.value.trim() ? "Message vide" : "") }],
    onMount: (dlg) => dlg.querySelectorAll("[data-s]").forEach((b) => (b.onclick = () => (dlg.querySelector("[name=message]").value = samples[b.dataset.s]))),
  });
  if (!value) return;
  try {
    const ack = await api("/api/apis/ingest", { method: "POST", body: { message: form.message.value } });
    await ctx.reload();
    toast(`${ack.status} — ${ack.flight} : ${ack.passengers} passager(s), ${ack.flagged} signalé(s)`, ack.flagged ? "critical" : "");
    location.hash = `#/apis?id=${ack.flightId}`;
  } catch (e) { toast(e.message, "critical"); }
}

function compliance(body, flights, messages) {
  const byCarrier = Object.values(flights.reduce((m, f) => {
    const c = (m[f.carrier] ||= { carrier: f.carrier, flights: 0, pax: 0, onTime: 0, complete: 0 });
    c.flights++; c.pax += f.passengers.length; if (f.onTime) c.onTime++;
    c.complete += f.passengers.filter((p) => p.dob && p.docNo && p.nat).length;
    return m;
  }, {}));
  const rejected = (name) => messages.filter((m) => m.status === "REJETÉ" && (m.carrierName || flights.find((f) => f.id === m.flightId)?.carrier) === name).length;
  body.innerHTML = `<section class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Transporteur</th><th class="num">Vols</th><th class="num">Passagers</th><th class="num">Transmission dans les délais</th><th class="num">Complétude des données</th><th class="num">Messages rejetés</th><th>Statut</th></tr></thead><tbody>
    ${byCarrier.map((c) => { const ot = c.onTime / c.flights, cp = c.complete / Math.max(1, c.pax); const ok = ot >= 0.95 && cp >= 0.98; return `<tr><td class="cell-title">${esc(c.carrier)}</td><td class="num">${c.flights}</td><td class="num">${fmtNum(c.pax)}</td><td class="num">${fmtNum(ot * 100, 0)} %</td><td class="num">${fmtNum(cp * 100, 1)} %</td><td class="num">${rejected(c.carrier)}</td><td>${ok ? '<span class="status good">Conforme</span>' : '<span class="status warning">À relancer</span>'}</td></tr>`; }).join("")}
  </tbody></table></div><div class="card-body small muted">Transmission attendue : API à la clôture du vol (UN/EDIFACT PAXLST) et PNR à H-48 / H-24 (PNRGOV), conformément aux normes OACI annexe 9.</div></section>`;
}

async function upload(ctx) {
  const { value, form } = await dialog({
    title: "APIS Gateway — charger un manifeste", wide: true,
    body: `<div class="form-grid">
      <label class="field"><span>Vol</span><input class="input" name="flight" placeholder="HC 405" required></label>
      <label class="field"><span>Transporteur</span><input class="input" name="carrier" placeholder="Air Sénégal"></label>
      <label class="field"><span>Trajet</span><input class="input" name="route" placeholder="CDG → DSS"></label>
      <label class="field"><span>Sens</span><select class="select" name="direction"><option value="ARRIVEE">Arrivée</option><option value="DEPART">Départ</option></select></label>
      <label class="field"><span>Horaire prévu</span><input class="input" type="datetime-local" name="eta"></label></div>
      <label class="field" style="margin-top:14px"><span>Passagers (CSV : siège;nom;prénoms;naissance;nationalité;document;expiration)</span><textarea class="textarea mono" name="csv" style="min-height:160px">${SAMPLE_CSV}</textarea></label>`,
    actions: [{ label: "Annuler", value: null }, { label: "Pré-contrôler", cls: "btn-primary", value: "ok", validate: (f) => (!f.flight.value.trim() ? "Indiquez le vol" : "") }],
  });
  if (!value) return;
  const f = Object.fromEntries(new FormData(form));
  const lines = f.csv.trim().split(/\r?\n/).filter((l) => l.trim());
  if (/nom/i.test(lines[0])) lines.shift();
  const passengers = lines.map((l) => { const [seat, surname, given, dob, nat, docNo, expiry] = l.split(/[;,\t]/).map((x) => x.trim()); return { seat, surname, given, dob, nat, docNo, expiry }; });
  const invalid = passengers.map((p, i) => (!p.surname || !p.docNo || !/^[A-Z]{3}$/i.test(p.nat || "") || !/^\d{4}-\d{2}-\d{2}$/.test(p.dob || "") ? i + 1 : 0)).filter(Boolean);
  if (!f.carrier.trim()) return toast("Indiquez le transporteur", "critical");
  if (!passengers.length || invalid.length) return toast(invalid.length ? `Lignes invalides : ${invalid.slice(0, 10).join(", ")} (nom, document, nationalité ISO et date AAAA-MM-JJ obligatoires)` : "Aucun passager", "critical");
  try {
    const fl = await api("/api/apis/manifest", { method: "POST", body: { ...f, eta: f.eta ? new Date(f.eta).toISOString() : undefined, passengers } });
    await ctx.reload();
    const hits = fl.passengers.filter((p) => p.score >= 30).length;
    toast(`${fl.passengers.length} passagers pré-contrôlés — ${hits} signalé(s)`, hits ? "critical" : "");
    location.hash = `#/apis?id=${fl.id}`;
  } catch (e) { toast(e.message, "critical"); }
}
