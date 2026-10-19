// APIS Monitor / Manager / Gateway : pré-contrôle des manifestes API/PNR, conformité des transporteurs.
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
  el.innerHTML = `${pageHead({ title: "APIS Monitor", sub: "Guichet unique API / PNR : chaque passager annoncé est confronté aux listes de surveillance, aux règles de ciblage et aux autorisations de voyage avant l'arrivée ou le départ.", crumbs: [[null, "APIS & e-Visa"]],
    actions: ctx.can("apis") ? `<button class="btn btn-primary" id="upload">${icon("upload")} Charger un manifeste</button>` : "" })}
  <nav class="space-tabs"><button aria-selected="${tab === "vols"}" data-tab="vols">Vols annoncés (${flights.length})</button><button aria-selected="${tab === "conformite"}" data-tab="conformite">Conformité transporteurs</button></nav>
  <div id="body"></div>`;
  el.querySelectorAll("[data-tab]").forEach((b) => (b.onclick = () => (location.hash = `#/apis?tab=${b.dataset.tab}`)));
  el.querySelector("#upload")?.addEventListener("click", () => upload(ctx));
  const body = el.querySelector("#body");
  if (tab === "conformite") return compliance(body, flights);

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
    mf.innerHTML = `<div class="card-head"><div class="grow"><h3>${esc(current.flight)} · ${esc(current.route)}</h3><div class="small muted">${esc(current.source)} · reçu ${fmtDateTime(current.receivedAt)}</div></div></div><div id="pax"></div>`;
    mountTable(mf.querySelector("#pax"), {
      rows: current.passengers, sort: "score", pageSize: 100,
      columns: [
        { key: "seat", label: "Siège" },
        { key: "surname", label: "Passager", render: (p) => `<div class="cell-title">${esc(p.surname)} ${esc(p.given)}</div><div class="cell-sub">${esc(country(p.nat))} · <span class="mono">${esc(p.docNo)}</span>${p.pnr ? ` · PNR ${esc(p.pnr)}` : ""}</div>` },
        { key: "score", label: "Pré-contrôle", value: (p) => p.score, render: (p) => riskBadge(p.score, p.level) },
        { key: "factors", label: "Motifs", sortable: false, render: (p) => `<span class="small">${esc(p.factors.filter((f) => f.points >= 10).map((f) => f.label).join(" · ") || "—")}</span>` },
      ],
    });
  }
}

function compliance(body, flights) {
  const byCarrier = Object.values(flights.reduce((m, f) => {
    const c = (m[f.carrier] ||= { carrier: f.carrier, flights: 0, pax: 0, onTime: 0, complete: 0 });
    c.flights++; c.pax += f.passengers.length; if (f.onTime) c.onTime++;
    c.complete += f.passengers.filter((p) => p.dob && p.docNo && p.nat).length;
    return m;
  }, {}));
  body.innerHTML = `<section class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Transporteur</th><th class="num">Vols</th><th class="num">Passagers</th><th class="num">Transmission dans les délais</th><th class="num">Complétude des données</th><th>Statut</th></tr></thead><tbody>
    ${byCarrier.map((c) => { const ot = c.onTime / c.flights, cp = c.complete / Math.max(1, c.pax); const ok = ot >= 0.95 && cp >= 0.98; return `<tr><td class="cell-title">${esc(c.carrier)}</td><td class="num">${c.flights}</td><td class="num">${fmtNum(c.pax)}</td><td class="num">${fmtNum(ot * 100, 0)} %</td><td class="num">${fmtNum(cp * 100, 1)} %</td><td>${ok ? '<span class="status good">Conforme</span>' : '<span class="status warning">À relancer</span>'}</td></tr>`; }).join("")}
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
