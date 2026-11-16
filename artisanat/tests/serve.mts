// Serveur local de prévisualisation (sans Netlify CLI) : fichiers de public/ + API sur /api/*. Usage : npm run serve
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";
process.env.ART_STORAGE ||= "memory";
const { default: handler } = await import("../netlify/functions/api.mts");
const PUB = new URL("../public/", import.meta.url).pathname;
const TYPES: Record<string, string> = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".md": "text/markdown; charset=utf-8" };
const REWRITES: Record<string, string> = { "/": "/index.html", "/admin": "/admin.html", "/documentation": "/docs.html" };
const port = Number(process.env.PORT || 8888);
createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://localhost:${port}`);
  if (url.pathname.startsWith("/api/")) {
    const chunks: Buffer[] = []; for await (const c of req) chunks.push(c as Buffer);
    const r = await handler(new Request(url, { method: req.method, headers: req.headers as any, body: ["GET", "HEAD"].includes(req.method!) ? undefined : Buffer.concat(chunks) }));
    res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer())); return;
  }
  const file = normalize(join(PUB, REWRITES[url.pathname] || decodeURIComponent(url.pathname)));
  if (!file.startsWith(PUB.replace(/\/$/, "") + sep)) { res.writeHead(403); res.end(); return; }
  try { const data = await readFile(file); res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream" }); res.end(data); }
  catch { res.writeHead(404); res.end("Introuvable"); }
}).listen(port, () => console.log(`Prévisualisation : http://localhost:${port}`));
