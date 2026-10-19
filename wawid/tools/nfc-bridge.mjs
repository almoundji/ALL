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

async function readFromReader(mrz) {
  if (MODE !== "simulation") throw new Error("Aucun pilote de lecteur configuré");
  await new Promise((r) => setTimeout(r, 900));
  return { read: true, protocol: "PACE", dg1: mrz, photo: null, passiveAuth: true, activeAuth: true, reader: "Pont WawID (simulation)" };
}

const cors = {
  "access-control-allow-origin": process.env.NFC_BRIDGE_ORIGIN || "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type",
  "access-control-allow-private-network": "true",
};

createServer(async (req, res) => {
  const send = (status, body) => { res.writeHead(status, { "content-type": "application/json", ...cors }); res.end(JSON.stringify(body)); };
  if (req.method === "OPTIONS") return send(204, {});
  if (req.method === "GET" && req.url === "/status") return send(200, { reader: MODE === "simulation" ? "Simulation" : MODE, version: "1.0", mode: MODE });
  if (req.method === "POST" && req.url === "/read") {
    let raw = "";
    for await (const c of req) raw += c;
    try {
      const { mrz } = JSON.parse(raw || "{}");
      if (!mrz) return send(400, { error: "MRZ requise pour dériver les clés BAC/PACE" });
      return send(200, await readFromReader(mrz));
    } catch (e) { return send(500, { read: false, error: e.message }); }
  }
  send(404, { error: "Route inconnue" });
}).listen(PORT, "127.0.0.1", () => console.log(`Pont NFC WawID : http://127.0.0.1:${PORT} (mode ${MODE})`));
