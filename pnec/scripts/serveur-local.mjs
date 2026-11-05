// Serveur de développement minimal : fichiers statiques + fonctions Netlify (/api/*).
// Usage : SESSION_SECRET=... PNEC_BLOBS_MEMOIRE=1 node --experimental-strip-types scripts/serveur-local.mjs
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const racine = new URL('../public/', import.meta.url).pathname;
const routes = [
  ['/api/auth/', '../netlify/functions/auth.mts'],
  ['/api/tri-cv', '../netlify/functions/tri-cv.mts'],
  ['/api/assistant', '../netlify/functions/assistant.mts'],
  ['/api/entretiens', '../netlify/functions/entretiens.mts'],
  ['/api/visio/', '../netlify/functions/visio.mts'],
];
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml' };

createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const route = routes.find(([p]) => url.pathname.startsWith(p));
  if (route) {
    const mod = await import(route[1]);
    const chunks = []; for await (const c of req) chunks.push(c);
    const r = await mod.default(new Request(url, { method: req.method, headers: req.headers, body: chunks.length ? Buffer.concat(chunks) : undefined }), { ip: req.socket.remoteAddress });
    res.writeHead(r.status, Object.fromEntries(r.headers));
    return res.end(Buffer.from(await r.arrayBuffer()));
  }
  const chemin = normalize(join(racine, url.pathname === '/' ? 'index.html' : url.pathname));
  if (!chemin.startsWith(racine)) { res.writeHead(403); return res.end(); }
  try {
    const data = await readFile(chemin);
    // Mêmes en-têtes de sécurité qu'en production (netlify.toml)
    const csp = (await readFile(new URL('../netlify.toml', import.meta.url), 'utf8')).match(/Content-Security-Policy = "([^"]+)"/)?.[1];
    res.writeHead(200, { 'Content-Type': types[extname(chemin)] || 'application/octet-stream', ...(csp ? { 'Content-Security-Policy': csp } : {}) });
    res.end(data);
  } catch { res.writeHead(404); res.end('Introuvable'); }
}).listen(process.env.PORT || 8888, () => console.log(`PNEC local : http://localhost:${process.env.PORT || 8888}`));
