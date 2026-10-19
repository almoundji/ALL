// Connecteurs vers les fichiers externes (Interpol I-24/7, WAPIS, fichier des personnes recherchées…).
// Sans configuration, la consultation s'appuie sur la copie synchronisée locale (liste de surveillance).
// Avec WAWID_CONNECTOR_<ID>_URL (+ _TOKEN), WawID interroge le service en temps réel :
//   POST <url>  { surname, given, dob, nat, docNo, issuer }  →  { hits: [{ list, severity, reason, reference, kind }] }
import { env } from "./auth.mts";

const envKey = (id: string) => `WAWID_CONNECTOR_${id.replace(/^CN-/, "").replace(/[^A-Z0-9]/g, "_")}`;

export function connectorConfigured(id: string) {
  return Boolean(env(`${envKey(id)}_URL`));
}

export function decorate(connectors: any[]) {
  return connectors.map((c) => ({ ...c, status: c.status === "DÉSACTIVÉ" ? c.status : connectorConfigured(c.id) ? "CONNECTÉ" : "SIMULÉ", envPrefix: envKey(c.id) }));
}

async function call(id: string, body: unknown, timeoutMs = 2500) {
  const url = env(`${envKey(id)}_URL`)!;
  const token = env(`${envKey(id)}_TOKEN`);
  const started = Date.now();
  const res = await fetch(url, {
    method: "POST", signal: AbortSignal.timeout(timeoutMs),
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return { data: await res.json(), latencyMs: Date.now() - started };
}

/** Interroge en parallèle les connecteurs configurés ; renvoie des entrées compatibles liste de surveillance. */
export async function externalHits(person: any, connectors: any[]) {
  const live = connectors.filter((c) => c.status !== "DÉSACTIVÉ" && connectorConfigured(c.id));
  const results = await Promise.allSettled(live.map((c) => call(c.id, {
    surname: person.surname, given: person.given, dob: person.dob, nat: person.nat, docNo: person.docNo, issuer: person.issuer,
  })));
  const entries: any[] = [], errors: string[] = [];
  results.forEach((r, i) => {
    const c = live[i];
    if (r.status === "rejected") { errors.push(`${c.name} : ${r.reason?.message || "indisponible"}`); return; }
    for (const h of r.value.data?.hits || []) {
      entries.push({
        id: `${c.id}-${h.reference || entries.length}`, kind: h.kind === "document" ? "document" : "person", source: c.source, list: h.list || c.name,
        surname: h.surname ?? person.surname, given: h.given ?? person.given, dob: h.dob ?? person.dob, docNo: h.docNo ?? person.docNo,
        severity: h.severity || "haute", reason: h.reason || "", reference: h.reference || "", active: true,
      });
    }
  });
  return { entries, errors };
}

export async function testConnector(c: any) {
  if (!connectorConfigured(c.id)) return { ok: true, simulated: true, message: "Mode simulé : copie locale synchronisée utilisée.", latencyMs: c.latencyMs ?? 0 };
  try {
    const { latencyMs } = await call(c.id, { ping: true }, 4000);
    return { ok: true, simulated: false, message: "Service joignable.", latencyMs };
  } catch (e: any) {
    return { ok: false, simulated: false, message: `Échec : ${e.message}` };
  }
}
