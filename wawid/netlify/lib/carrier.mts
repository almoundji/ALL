// Passerelle transporteurs : réception et décodage des messages API (UN/EDIFACT PAXLST)
// et PNR (enregistrement de réservation au format texte IATA : RLOC, segments, SSR DOCS, CTCE/CTCM, FP).
// Référence : OACI annexe 9, lignes directrices OMD/IATA/OACI API et PNR (PAXLST D02B, PNRGOV).

export type Passenger = {
  surname: string; given: string; dob: string | null; sex: string; nat: string; docType: string; docNo: string; issuer: string; expiry: string | null;
  seat?: string; pnr?: string; embark?: string; debark?: string; crew?: boolean;
  email?: string; phone?: string; payment?: string; bookedAt?: string | null; oneWay?: boolean; itinerary?: string[];
};
export type CarrierMessage = {
  format: "PAXLST" | "PNR"; flight: string; carrier: string; origin: string; destination: string;
  departure: string | null; arrival: string | null; passengers: Passenger[]; errors: string[];
};

const MONTHS: Record<string, string> = { JAN: "01", FEB: "02", MAR: "03", APR: "04", MAY: "05", JUN: "06", JUL: "07", AUG: "08", SEP: "09", OCT: "10", NOV: "11", DEC: "12" };

/** AAMMJJ (EDIFACT) → AAAA-MM-JJ ; `past` : date de naissance (jamais dans le futur). */
function ymd(v: string | undefined, past = false): string | null {
  if (!v || !/^\d{6}/.test(v)) return null;
  let y = 2000 + Number(v.slice(0, 2));
  if (past && y > new Date().getUTCFullYear()) y -= 100;
  return `${y}-${v.slice(2, 4)}-${v.slice(4, 6)}`;
}
/** AAMMJJHHMM → ISO */
function ymdhm(v: string | undefined): string | null {
  const d = ymd(v);
  if (!d) return null;
  return `${d}T${(v!.slice(6, 8) || "00")}:${(v!.slice(8, 10) || "00")}:00Z`;
}
/** 12JAN80 (IATA) → AAAA-MM-JJ */
function ddmmmyy(v: string | undefined, past = false): string | null {
  const m = /^(\d{2})([A-Z]{3})(\d{2,4})$/.exec(String(v || "").toUpperCase());
  if (!m || !MONTHS[m[2]]) return null;
  let y = m[3].length === 4 ? Number(m[3]) : 2000 + Number(m[3]);
  if (past && y > new Date().getUTCFullYear()) y -= 100;
  return `${y}-${MONTHS[m[2]]}-${m[1]}`;
}

// ---------- UN/EDIFACT ----------

/** Découpe un message EDIFACT en segments/éléments/composants (gère UNA et le caractère d'échappement). */
export function edifactSegments(text: string): string[][][] {
  let src = text.replace(/\r?\n/g, "");
  let comp = ":", elem = "+", rel = "?", term = "'";
  if (src.startsWith("UNA")) { comp = src[3]; elem = src[4]; rel = src[6]; term = src[8]; src = src.slice(9); }
  const segments: string[][][] = [];
  let seg: string[][] = [], el: string[] = [], cur = "";
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c === rel && i + 1 < src.length) { cur += src[++i]; continue; }
    if (c === comp) { el.push(cur); cur = ""; continue; }
    if (c === elem) { el.push(cur); seg.push(el); el = []; cur = ""; continue; }
    if (c === term) { el.push(cur); seg.push(el); segments.push(seg); seg = []; el = []; cur = ""; continue; }
    cur += c;
  }
  if (cur || el.length || seg.length) { el.push(cur); seg.push(el); segments.push(seg); }
  return segments.filter((s) => s[0]?.[0]?.trim());
}

export function parsePaxlst(text: string): CarrierMessage {
  const segs = edifactSegments(text.trim());
  const errors: string[] = [];
  const msg: CarrierMessage = { format: "PAXLST", flight: "", carrier: "", origin: "", destination: "", departure: null, arrival: null, passengers: [], errors };
  if (!segs.some((s) => s[0][0] === "UNH" && /PAXLST/.test(s[2]?.[0] || ""))) errors.push("En-tête UNH PAXLST absent");
  let crewList = false;
  let p: Passenger | null = null;
  let lastLoc = "";
  const push = () => { if (p) msg.passengers.push(p); p = null; };
  for (const s of segs) {
    const tag = s[0][0];
    const e = (i: number, j = 0) => (s[i]?.[j] ?? "").trim();
    switch (tag) {
      case "BGM": crewList = e(1) === "250"; break;
      case "TDT": msg.flight = e(2).replace(/\s+/g, ""); msg.carrier = msg.flight.slice(0, 2); break;
      case "NAD":
        if (["FL", "FM", "DDT", "DDU", "COT"].includes(e(1))) {
          push();
          p = { surname: e(4, 0), given: [e(4, 1), e(4, 2)].filter(Boolean).join(" "), dob: null, sex: "X", nat: "", docType: "", docNo: "", issuer: "", expiry: null, crew: crewList || e(1) !== "FL" };
        }
        break;
      case "ATT": if (p && e(1) === "2") p.sex = ["M", "F"].includes(e(3)) ? e(3) : "X"; break;
      case "NAT": if (p) p.nat = e(2); break;
      case "RFF":
        if (p && e(1, 0) === "AVF") p.pnr = e(1, 1);
        if (p && e(1, 0) === "SEA") p.seat = e(1, 1);
        break;
      case "DOC": if (p) { p.docType = e(1, 0) || "P"; p.docNo = e(2).replace(/[^A-Z0-9]/gi, "").toUpperCase(); } break;
      case "LOC":
        lastLoc = e(1);
        if (!p) { if (lastLoc === "125") msg.origin = e(2); if (lastLoc === "87") msg.destination = e(2); }
        else { if (lastLoc === "178") p.embark = e(2); if (lastLoc === "179") p.debark = e(2); if (lastLoc === "91") p.issuer = e(2); }
        break;
      case "DTM": {
        const q = e(1, 0), v = e(1, 1);
        if (!p) { if (q === "189") msg.departure = ymdhm(v); if (q === "232") msg.arrival = ymdhm(v); }
        else { if (q === "329") p.dob = ymd(v, true); if (q === "36") p.expiry = ymd(v); }
        break;
      }
      case "UNT": push(); break;
    }
  }
  push();
  if (!msg.flight) errors.push("Segment TDT (vol) absent");
  return msg;
}

// ---------- PNR (texte IATA) ----------

/**
 * Format accepté (une ligne par élément) :
 *   RLOC ABC123            BKD 18OCT26            FP CASH | FP CC
 *   1.MARTIN/PAUL MR       2.MARTIN/ANNE MRS
 *   HC 404 Y 25OCT CDGDSS  (un segment par ligne ; plusieurs segments = itinéraire)
 *   SSR DOCS HC HK1 P/FRA/19AB12345/FRA/01JAN80/M/01JAN32/MARTIN/PAUL/P1
 *   SSR CTCE HC HK1 PAUL//MARTIN.FR/P1      SSR CTCM HC HK1 33612345678/P1
 * Plusieurs PNR peuvent se suivre, séparés par une ligne vide ou « END ».
 */
export function parsePnr(text: string, now = new Date()): CarrierMessage {
  const errors: string[] = [];
  const msg: CarrierMessage = { format: "PNR", flight: "", carrier: "", origin: "", destination: "", departure: null, arrival: null, passengers: [], errors };
  const blocks = text.toUpperCase().split(/\n\s*(?:END\s*)?\n|\nEND\n/).map((b) => b.trim()).filter(Boolean);
  for (const block of blocks) {
    const lines = block.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    let rloc = "", bookedAt: string | null = null, payment = "";
    const names: { surname: string; given: string }[] = [];
    const segments: { flight: string; date: string | null; from: string; to: string }[] = [];
    const docs = new Map<number, Partial<Passenger>>();
    const contacts = new Map<number, { email?: string; phone?: string }>();
    for (const l of lines) {
      let m;
      if ((m = /^RLOC\s+([A-Z0-9]{5,8})/.exec(l))) rloc = m[1];
      else if ((m = /^BKD\s+(\S+)/.exec(l))) bookedAt = ddmmmyy(m[1]);
      else if ((m = /^FP\s+(\S+)/.exec(l))) payment = m[1].startsWith("CASH") || m[1] === "CA" ? "Espèces" : m[1].startsWith("CC") ? "Carte" : m[1];
      else if ((m = /^(\d+)\.([A-Z' -]+)\/([A-Z' -]+?)(?:\s+(MR|MRS|MS|MSTR|MISS|CHD|INF))?$/.exec(l))) names[Number(m[1]) - 1] = { surname: m[2].trim(), given: m[3].trim() };
      else if ((m = /^([A-Z0-9]{2})\s?(\d{1,4})\s+[A-Z]\s+(\d{2}[A-Z]{3})\s+([A-Z]{3})([A-Z]{3})/.exec(l))) {
        const date = ddmmmyy(`${m[3]}${String(now.getUTCFullYear()).slice(2)}`);
        segments.push({ flight: `${m[1]}${m[2]}`, date, from: m[4], to: m[5] });
      } else if ((m = /^SSR\s+DOCS\s+\S+\s+\S+\s+(.+)$/.exec(l))) {
        const f = m[1].split("/");
        const ref = Number((f[9] || "P1").replace(/\D/g, "")) || 1;
        docs.set(ref, { docType: f[0], issuer: f[1], docNo: (f[2] || "").replace(/[^A-Z0-9]/g, ""), nat: f[3], dob: ddmmmyy(f[4], true), sex: ["M", "F"].includes(f[5]) ? f[5] : "X", expiry: ddmmmyy(f[6]), surname: f[7], given: f[8] });
      } else if ((m = /^SSR\s+CTC([EM])\s+\S+\s+\S+\s+(.+?)(?:\/P(\d+))?$/.exec(l))) {
        const ref = Number(m[3] || 1);
        const c = contacts.get(ref) || {};
        if (m[1] === "E") c.email = m[2].replace("//", "@").replace(/\.\./g, "_").toLowerCase(); else c.phone = m[2].replace(/\D/g, "");
        contacts.set(ref, c);
      }
    }
    if (!segments.length) { errors.push(`PNR ${rloc || "?"} : aucun segment de vol`); continue; }
    const into = segments.find((sg) => sg.to === "DSS" || sg.to === "ZIG") || segments[0];
    if (!msg.flight) Object.assign(msg, { flight: into.flight, carrier: into.flight.slice(0, 2), origin: into.from, destination: into.to, arrival: into.date ? `${into.date}T00:00:00Z` : null });
    const oneWay = !segments.some((sg) => sg.from === into.to);
    const count = Math.max(names.filter(Boolean).length, docs.size);
    for (let i = 1; i <= count; i++) {
      const d = docs.get(i) || {}, n = names[i - 1] || { surname: d.surname || "", given: d.given || "" };
      if (!d.docNo) errors.push(`PNR ${rloc} : passager ${i} sans SSR DOCS`);
      msg.passengers.push({
        surname: d.surname || n.surname, given: d.given || n.given, dob: d.dob ?? null, sex: d.sex || "X", nat: d.nat || "", docType: d.docType || "P",
        docNo: d.docNo || "", issuer: d.issuer || "", expiry: d.expiry ?? null, pnr: rloc, embark: into.from, debark: into.to,
        email: contacts.get(i)?.email, phone: contacts.get(i)?.phone, payment, bookedAt, oneWay, itinerary: segments.map((sg) => `${sg.flight} ${sg.from}-${sg.to}${sg.date ? ` ${sg.date}` : ""}`),
      });
    }
  }
  if (!msg.passengers.length) errors.push("Aucun passager décodé");
  return msg;
}

export function detectFormat(text: string): "PAXLST" | "PNR" | null {
  const t = text.trim().toUpperCase();
  if (/^(UNA|UNB)/.test(t) || /UNH\+[^']*PAXLST/.test(t)) return "PAXLST";
  if (/RLOC\s|SSR\s+DOCS/.test(t)) return "PNR";
  return null;
}

/** Indicateurs de risque propres aux données de réservation (explicables, paramétrables par règles). */
export function pnrFactors(p: Passenger, eta: string | null) {
  const f: { code: string; label: string; points: number; detail: string }[] = [];
  if (p.payment === "Espèces") f.push({ code: "PNR_ESPECES", label: "Billet payé en espèces", points: 10, detail: "" });
  if (p.oneWay) f.push({ code: "PNR_ALLER_SIMPLE", label: "Aller simple sans retour réservé", points: 5, detail: "" });
  if (p.bookedAt && eta) {
    const h = (Date.parse(eta) - Date.parse(p.bookedAt + "T00:00:00Z")) / 3600000;
    if (h >= 0 && h < 48) f.push({ code: "PNR_DERNIERE_MINUTE", label: "Réservation de dernière minute", points: 10, detail: `${Math.round(h)} h avant le vol` });
  }
  return f;
}

/** Exemples conformes, utilisés par le back-office (« Simuler un envoi ») et la documentation. */
export function samples(now = new Date()) {
  const d = new Date(now.getTime() + 6 * 3600000);
  const yy = String(d.getUTCFullYear()).slice(2), mm = String(d.getUTCMonth() + 1).padStart(2, "0"), dd = String(d.getUTCDate()).padStart(2, "0");
  const edi = (t: Date) => `${String(t.getUTCFullYear()).slice(2)}${String(t.getUTCMonth() + 1).padStart(2, "0")}${String(t.getUTCDate()).padStart(2, "0")}${String(t.getUTCHours()).padStart(2, "0")}${String(t.getUTCMinutes()).padStart(2, "0")}`;
  const dep = new Date(now.getTime() + 2 * 3600000), arr = new Date(now.getTime() + 7 * 3600000);
  const mon = Object.keys(MONTHS)[d.getUTCMonth()];
  const bkd = new Date(now.getTime() - 20 * 3600000);
  return {
    PAXLST: [
      "UNA:+.? '",
      `UNB+UNOA:4+HC:ZZ+SNPIU:ZZ+${yy}${mm}${dd}:0900+000001'`,
      "UNG+PAXLST+AIR SENEGAL+SNPIU+" + `${yy}${mm}${dd}:0900+1+UN+D:02B'`,
      "UNH+1+PAXLST:D:02B:UN:IATA+HC404+01:F'",
      "BGM+745'",
      "NAD+MS+++DEPARTEMENT CONTROLE HC'",
      "TDT+20+HC404'",
      "LOC+125+CDG'",
      `DTM+189:${edi(dep)}:201'`,
      "LOC+87+DSS'",
      `DTM+232:${edi(arr)}:201'`,
      "NAD+FL+++NDIAYE:FATOU+12 RUE DE LA PAIX+PARIS'", "ATT+2++F'", "DTM+329:900211'", "LOC+178+CDG'", "LOC+179+DSS'", "NAT+2+SEN'", "RFF+AVF:QX7K2P'", "RFF+SEA:12A'",
      "DOC+P:110:111+A07711223'", "DTM+36:300101'", "LOC+91+SEN'",
      "NAD+FL+++KABORE:ISSOUF:MALICK+++'", "ATT+2++M'", "DTM+329:810412'", "LOC+178+CDG'", "LOC+179+DSS'", "NAT+2+BFA'", "RFF+AVF:ZZ81LM'", "RFF+SEA:31C'",
      "DOC+P:110:111+BF7712093'", "DTM+36:290201'", "LOC+91+BFA'",
      "NAD+FL+++MARTIN:CLAIRE+++'", "ATT+2++F'", "DTM+329:781224'", "LOC+178+CDG'", "LOC+179+DSS'", "NAT+2+FRA'", "RFF+AVF:LM45TT'", "RFF+SEA:4D'",
      "DOC+P:110:111+21CX88341'", "DTM+36:310530'", "LOC+91+FRA'",
      "CNT+42:3'",
      "UNT+38+1'", "UNE+1+1'", "UNZ+1+000001'",
    ].join("\n"),
    PNR: [
      "RLOC ZZ81LM", `BKD ${String(bkd.getUTCDate()).padStart(2, "0")}${Object.keys(MONTHS)[bkd.getUTCMonth()]}${String(bkd.getUTCFullYear()).slice(2)}`, "FP CASH",
      "1.WANG/LEI MR", "2.YILMAZ/EMRE MR",
      `TK 597 Y ${dd}${mon} ISTDSS`,
      "SSR DOCS TK HK1 P/CHN/E81234567/CHN/09MAR85/M/01AUG30/WANG/LEI/P1",
      "SSR DOCS TK HK1 P/TUR/U12098877/TUR/14FEB90/M/10OCT29/YILMAZ/EMRE/P2",
      "SSR CTCM TK HK1 221770001313/P1", "SSR CTCM TK HK1 221770001313/P2",
      "SSR CTCE TK HK1 VOYAGE.DAKAR0//EXEMPLE.ORG/P1",
      "END",
      "RLOC QX7K2P", `BKD 02${Object.keys(MONTHS)[(d.getUTCMonth() + 11) % 12]}${yy}`, "FP CC",
      "1.SOW/MARIAMA MRS",
      `HC 404 Y ${dd}${mon} CDGDSS`, "HC 405 Y 30DEC DSSCDG",
      "SSR DOCS HC HK1 P/SEN/A05544332/SEN/03MAR88/F/12DEC31/SOW/MARIAMA/P1",
      "SSR CTCE HC HK1 MARIAMA.SOW//EXEMPLE.SN/P1",
    ].join("\n"),
  };
}
