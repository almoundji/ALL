// Compile la documentation bilingue (docs/content/{fr,en}/*.md + manifest.json) en un module embarqué
// dans la fonction API (netlify/lib/docs-content.mjs). Exécuté au build et au démarrage du serveur local.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const manifest = JSON.parse(readFileSync(join(root, "docs/content/manifest.json"), "utf8"));
const pages = { fr: {}, en: {} };
for (const s of manifest.sections) for (const p of s.pages) for (const l of ["fr", "en"]) {
  const f = join(root, "docs/content", l, `${p.slug}.md`);
  pages[l][p.slug] = existsSync(f) ? readFileSync(f, "utf8") : `# ${p[l]}\n\n${l === "fr" ? "Page en cours de rédaction." : "Page in preparation."}\n`;
}
writeFileSync(join(root, "netlify/lib/docs-content.mjs"), `// Généré par tools/build-docs.mjs — ne pas modifier à la main.\nexport default ${JSON.stringify({ manifest, pages })};\n`);
console.log(`Documentation compilée : ${Object.keys(pages.fr).length} pages × 2 langues`);
