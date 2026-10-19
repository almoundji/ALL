// eKYC à distance (inspiré des parcours RealID / anti-deepfake du marché, ex. ZOLOZ) :
//  - avant : intégrité de l'appareil (caméra virtuelle = attaque par injection) et identifiant d'appareil ;
//  - pendant : qualité d'image mesurée réellement (luminosité, netteté), présence du visage, défis de vivacité ;
//  - après : réseau d'identités et liste noire, calculés côté serveur.
// L'authenticité du document, la comparaison faciale et la détection de contenus générés par IA sont simulées
// tant qu'aucun fournisseur eKYC (SDK ou API) n'est branché ; le résultat l'indique (provider: "simulation").
import { hashString, simulatedBiometric } from "./engine.js";

/** Identifiant d'appareil stable (par navigateur), utilisé pour la détection de réseaux de fraude. */
export function deviceId() {
  try {
    let id = localStorage.getItem("wawid:device");
    if (!id) { id = crypto.randomUUID(); localStorage.setItem("wawid:device", id); }
    return id;
  } catch { return "inconnu"; }
}

const VIRTUAL_CAMERA = /virtual|obs|manycam|snap camera|xsplit|droidcam|epoccam|mmhmm|camtwist|splitcam|youcam|e2esoft|vcam/i;

/** Caméras virtuelles (logiciels d'injection vidéo) parmi les périphériques — libellés visibles après autorisation caméra. */
export async function virtualCameras() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((d) => d.kind === "videoinput" && VIRTUAL_CAMERA.test(d.label)).map((d) => d.label);
  } catch { return []; }
}

/** Mesure réelle de la qualité d'une image : luminosité moyenne (0–255) et netteté (variance du laplacien). */
export function imageQuality(source) {
  const w = 320, h = Math.round(320 * ((source.videoHeight || source.height) / (source.videoWidth || source.width) || 0.75));
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d", { willReadFrequently: true });
  g.drawImage(source, 0, 0, w, h);
  const px = g.getImageData(0, 0, w, h).data;
  const lum = new Float32Array(w * h);
  let sum = 0;
  for (let i = 0; i < w * h; i++) { lum[i] = 0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2]; sum += lum[i]; }
  const brightness = sum / (w * h);
  let n = 0, mean = 0, m2 = 0;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    const lap = lum[i - w] + lum[i + w] + lum[i - 1] + lum[i + 1] - 4 * lum[i];
    n++; const d = lap - mean; mean += d / n; m2 += d * (lap - mean);
  }
  const sharpness = n ? m2 / n : 0;
  return {
    brightness: Math.round(brightness), sharpness: Math.round(sharpness),
    lightOk: brightness > 60 && brightness < 215, sharpOk: sharpness > 60,
  };
}

/** Détection de visage avec l'API native du navigateur quand elle existe (sinon null = non vérifiable). */
export async function faceCount(source) {
  if (!("FaceDetector" in window)) return null;
  try { return (await new window.FaceDetector({ fastMode: true }).detect(source)).length; } catch { return null; }
}

export const CHALLENGES = ["Regardez l'objectif", "Clignez des yeux", "Tournez légèrement la tête à gauche", "Souriez"];

/**
 * Résultat d'analyse eKYC (simulation des modules non disponibles dans le navigateur).
 * attack : "", "ecran", "impression", "deepfake", "injection" — scénarios de démonstration.
 */
export function analyse({ docNo, docQuality, selfieQuality, faces, virtual = [], attack = "" }) {
  const seed = `${docNo}-${hashString(String(Date.now()))}`;
  return {
    provider: "simulation",
    deviceId: deviceId(),
    docQuality, selfieQuality, faceDetected: faces === null ? null : faces > 0,
    document: { recapture: attack === "ecran", printed: attack === "impression", tampering: false, aigc: false },
    faceScore: simulatedBiometric(seed, attack ? 0.6 : 0.94),
    liveness: !attack,
    deepfake: attack === "deepfake",
    injection: attack === "injection" || virtual.length > 0,
    virtualCameras: virtual,
  };
}
