// Données de démonstration : une école et une résidence. Tout est fictif (noms, numéros, montants).
import { addMonths, createTenant, currentMonth, dueDate, nextRef, recordPayment, type TenantState, uid } from "./core.mts";

let seed = 20261116;
const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
const NAMES = ["Aminata Diallo", "Moussa Ndiaye", "Fatou Sarr", "Ibrahima Fall", "Khady Gueye", "Ousmane Sow", "Mariama Ba", "Cheikh Diop", "Awa Faye", "Mamadou Sy", "Ndèye Thiam", "Abdoulaye Kane", "Seynabou Mbaye", "Pape Dieng", "Rokhaya Cissé", "Modou Lô", "Bineta Diouf", "Lamine Camara", "Astou Niang", "Babacar Seck", "Coumba Wade", "Idrissa Diagne", "Mame Diarra Sène", "Alioune Mbodj", "Adama Touré", "Yacine Ndoye", "Serigne Mbacké", "Dieynaba Sall", "Malick Gning", "Sokhna Bousso"];
const KIDS = ["Alioune", "Maïmouna", "Pape", "Sokhna", "Omar", "Aïda", "Mouhamed", "Fatima", "Samba", "Ndèye", "Elhadji", "Mariama", "Abdou", "Khadija", "Ismaïla", "Oumou", "Tidiane", "Rama", "Baye", "Adja"];
const CLASSES: [string, number][] = [["Petite section", 45000], ["Grande section", 45000], ["CP", 55000], ["CE1", 55000], ["CE2", 55000], ["CM1", 55000], ["CM2", 55000], ["6e", 65000], ["5e", 65000], ["4e", 65000], ["3e", 65000], ["2nde", 75000], ["Terminale", 75000]];
const CHANNELS = ["Alias PI-SPI", "Alias PI-SPI", "Wave", "Wave", "Wave", "Orange Money", "Orange Money", "Virement", "Espèces"];
const tel = () => `77 ${100 + Math.floor(rnd() * 900)} ${10 + Math.floor(rnd() * 90)} ${10 + Math.floor(rnd() * 90)}`;
const aliasOf = (nom: string) => nom.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z ]/g, "").trim().replace(/ +/g, ".");
const pad = (n: number) => String(n).padStart(2, "0");

function addPayerContract(s: TenantState, nom: string, label: string, group: string, amount: number, startMonth: string, withAlias: boolean) {
  const payer = { id: uid(), nom, tel: tel(), alias: withAlias ? aliasOf(nom) : "", email: "", note: "", createdAt: new Date().toISOString() };
  s.payers.push(payer);
  const c = { id: uid(), payerId: payer.id, ref: nextRef(s), label, group, amount, startMonth, endMonth: null, active: true };
  s.contracts.push(c); return { payer, contract: c };
}

// Historique : pour chaque mois passé, paiement complet (parfois en retard) ; pour le mois courant, 62 % payés, 12 % partiels, le reste en retard.
function history(s: TenantState, months: string[], current: string, byLabel: string) {
  for (const c of s.contracts) {
    const p = s.payers.find((x) => x.id === c.payerId)!;
    const channel = pick(CHANNELS);
    const sender = channel === "Alias PI-SPI" && p.alias ? p.alias : channel === "Virement" ? p.nom.toUpperCase() : channel === "Espèces" ? "Caisse" : p.tel;
    for (const m of months) {
      const late = rnd() < 0.25; const day = late ? 6 + Math.floor(rnd() * 14) : 1 + Math.floor(rnd() * 5);
      recordPayment(s, { date: `${m}-${pad(day)}`, amount: c.amount, sender, label: `${c.ref} ${m}`, channel, ref: `${channel.slice(0, 2).toUpperCase()}${m.replace("-", "")}${Math.floor(rnd() * 9e5 + 1e5)}` }, "import", byLabel, { contractId: c.id, month: m });
    }
    const r = rnd();
    if (r < 0.62) recordPayment(s, { date: `${current}-${pad(1 + Math.floor(rnd() * 11))}`, amount: c.amount, sender, label: `${c.ref} ${current}`, channel, ref: `${channel.slice(0, 2).toUpperCase()}${current.replace("-", "")}${Math.floor(rnd() * 9e5 + 1e5)}` }, channel === "Espèces" ? "manuel" : "import", byLabel, { contractId: c.id, month: current });
    else if (r < 0.74) recordPayment(s, { date: `${current}-${pad(2 + Math.floor(rnd() * 9))}`, amount: Math.round(c.amount * pick([0.4, 0.5, 0.6]) / 1000) * 1000, sender, label: `${c.ref} ${current} acompte`, channel, ref: `${channel.slice(0, 2).toUpperCase()}${current.replace("-", "")}${Math.floor(rnd() * 9e5 + 1e5)}` }, "import", byLabel, { contractId: c.id, month: current });
  }
}

// Lignes reçues qui demandent une vérification humaine (passent par le rapprochement automatique).
function pendingLines(s: TenantState, current: string) {
  const late = s.contracts.filter((c) => !s.payments.some((p) => p.contractId === c.id && p.month === current && p.status === "associe"));
  const payerOf = (c: any) => s.payers.find((p) => p.id === c.payerId)!;
  const L = (i: number) => late[i % late.length];
  const lines = [
    { date: `${current}-09`, amount: L(0).amount, sender: `Seydou ${payerOf(L(0)).nom.split(" ").pop()} · 78 455 21 09`, label: "Scolarité", channel: "Wave", ref: "WV1109A7F3" },
    { date: `${current}-10`, amount: L(1).amount * 2, sender: payerOf(L(1)).tel, label: "Frais école", channel: "Orange Money", ref: "OM2211B0C4" },
    { date: `${current}-11`, amount: 110000, sender: "DIAGNE ET FRERES SARL", label: "Virement", channel: "Virement", ref: "VIR-0431" },
    { date: `${current}-12`, amount: L(2).amount, sender: `papa.${payerOf(L(2)).nom.split(" ").pop()!.toLowerCase()}`, label: `${L(2).ref} ${current}`, channel: "Alias PI-SPI", ref: "PI11587720" },
    { date: `${current}-12`, amount: 55000, sender: "70 334 09 77", label: "", channel: "Wave", ref: "WV1112C9D1" },
    { date: `${current}-06`, amount: L(3).amount - 5000, sender: `tante.${payerOf(L(3)).nom.split(" ").pop()!.toLowerCase()}`, label: "mensualite", channel: "Orange Money", ref: "OM0611F7B2" },
  ];
  for (const l of lines) recordPayment(s, l, "api", "API PI-SPI");
}

export function demoSchool(): TenantState {
  const current = currentMonth(); const months = [-5, -4, -3, -2, -1].map((n) => addMonths(current, n));
  const s = createTenant({ name: "École Keur Xaleyi (démo)", type: "ecole", city: "Dakar", alias: "keur-xaleyi", demo: true }, []);
  NAMES.forEach((nom, i) => { const cl = pick(CLASSES); addPayerContract(s, nom, `${pick(KIDS)} ${nom.split(" ").pop()}`, cl[0], cl[1], months[0], i % 15 !== 7); });
  history(s, months, current, "Import relevé"); pendingLines(s, current);
  s.audit.push({ ts: new Date().toISOString(), user: "système", action: "demo.seed", details: `Données de démonstration générées, échéance du ${dueDate(current, 5)}` });
  return s;
}

export function demoLandlord(): TenantState {
  const current = currentMonth(); const months = [-3, -2, -1].map((n) => addMonths(current, n));
  const s = createTenant({ name: "Résidence Les Almadies (démo)", type: "bailleur", city: "Dakar", alias: "res-almadies", dueDay: 5, demo: true }, []);
  const lots: [string, string, number][] = [["Appt A1", "Bâtiment A", 350000], ["Appt A2", "Bâtiment A", 350000], ["Appt A3", "Bâtiment A", 400000], ["Appt B1", "Bâtiment B", 275000], ["Appt B2", "Bâtiment B", 275000], ["Appt B3", "Bâtiment B", 300000], ["Studio C1", "Bâtiment C", 180000], ["Studio C2", "Bâtiment C", 180000], ["Studio C3", "Bâtiment C", 180000], ["Boutique RDC", "Bâtiment A", 450000], ["Villa D", "Annexe", 650000], ["Parking P1", "Annexe", 40000]];
  lots.forEach(([label, group, amount], i) => addPayerContract(s, NAMES[(i * 2 + 3) % NAMES.length], label, group, amount, months[0], i % 5 !== 2));
  history(s, months, current, "Import relevé");
  return s;
}
