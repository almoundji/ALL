// Pont NFC local WawID : relie le navigateur du guichet / de l'eGate au lecteur de documents.
//
//   node tools/nfc-bridge.mjs            (écoute sur http://127.0.0.1:8765)
//
// Protocole (HTTP local, CORS + Private Network Access) :
//   GET  /status  → { reader, version, mode }
//   POST /read    { mrz }  → { read, protocol, dg1, photo, passiveAuth, activeAuth, reader }
//
// Brancher un vrai lecteur : remplacer readFromReader() par l'appel au SDK du constructeur
// (Regula Document Reader, Thales/Gemalto, ARH, Innovatrics…) ou par une pile PC/SC + ICAO 9303
// (accès BAC/PACE dérivé de la MRZ, lecture EF.COM, DG1, DG2, EF.SOD ; authentification passive
// contre les certificats CSCA de l'ICAO PKD ; authentification active / chip si DG15/DG14).
// Le pont n'écoute que sur la boucle locale : les données ne quittent le poste que via WawID.
import { createServer } from "node:http";

const PORT = Number(process.env.NFC_BRIDGE_PORT) || 8765;
const MODE = process.env.NFC_BRIDGE_MODE || "simulation";

// En simulation, les scénarios de démonstration (puce clonée, page altérée…) sont respectés.
async function readFromReader(mrz, simulate = {}) {
  if (MODE !== "simulation") throw new Error("Aucun pilote de lecteur configuré");
  await new Promise((r) => setTimeout(r, 900));
  if (simulate.read === false) return { read: false, reader: "Pont WawID (simulation)" };
  const pa = simulate.passiveAuth ?? true;
  return { read: true, protocol: "PACE", dg1: simulate.dg1 ?? mrz, photo: null, passiveAuth: pa, activeAuth: pa, reader: "Pont WawID (simulation)" };
}

// Seules les origines WawID autorisées peuvent lire un passeport posé sur le lecteur.
const ALLOWED = (process.env.NFC_BRIDGE_ORIGIN || "https://wawid-waw-telecom.netlify.app,http://localhost:8888").split(",").map((s) => s.trim());
const cors = (origin) => ({
  ...(ALLOWED.includes(origin) ? { "access-control-allow-origin": origin, vary: "origin" } : {}),
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type",
  "access-control-allow-private-network": "true",
});

createServer(async (req, res) => {
  const origin = req.headers.origin;
  const send = (status, body) => { res.writeHead(status, { "content-type": "application/json", ...cors(origin) }); res.end(status === 204 ? undefined : JSON.stringify(body)); };
  if (origin && !ALLOWED.includes(origin)) return send(403, { error: "Origine non autorisée" });
  if (req.method === "OPTIONS") return send(204, {});
  if (req.method === "GET" && req.url === "/status") return send(200, { reader: MODE === "simulation" ? "Simulation" : MODE, version: "1.0", mode: MODE });
  if (req.method === "POST" && req.url === "/read") {
    let raw = "";
    for await (const c of req) raw += c;
    let input;
    try { input = JSON.parse(raw || "{}"); } catch { return send(400, { error: "JSON invalide" }); }
    if (!input.mrz) return send(400, { error: "MRZ requise pour dériver les clés BAC/PACE" });
    try { return send(200, await readFromReader(input.mrz, input.simulate || {})); } catch (e) { return send(500, { read: false, error: e.message }); }
  }
  send(404, { error: "Route inconnue" });
}).listen(PORT, "127.0.0.1", () => console.log(`Pont NFC WawID : http://127.0.0.1:${PORT} (mode ${MODE})`));
