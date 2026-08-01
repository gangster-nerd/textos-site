// Gate CI/build (schema-map.spec.md §6, copy-safety-rules.spec.md §9) :
// extrait le JSON-LD des pages buildées et vérifie les invariants doctrinaux.
// Défense en profondeur : le validateur porte SA PROPRE copie des invariants ;
// si une page diverge, la CI échoue.

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

// Seules ces features (public_marketable) peuvent apparaître en featureList.
const ALLOWED_FEATURES = new Set([
  "Authority Presence measurement",
  "Direct Share of Model",
  "Indirect Mention Share",
  "Total Authority Presence",
  "Measurement quality ledger",
]);

// Termes interdits sur les SURFACES MARKETING (capability-registry.spec.md §6,
// copy-safety-rules.spec.md §4). Appliqués au JSON-LD de la homepage.
const FORBIDDEN = [
  /authority\s*score/i,
  /guarantee[sd]?\b[^.]*\b(ranking|google)/i,
  /opportunity\s*brief/i,
  /verif(y|ies|ied)\b[^.]*claims?/i,
  /appear in all ai answers/i,
];

function fail(msg) {
  console.error("❌ VALIDATION FAILED:", msg);
  process.exit(1);
}

function readNodes(htmlPath) {
  let html;
  try {
    html = readFileSync(htmlPath, "utf8");
  } catch {
    fail(`${htmlPath} introuvable — lance 'pnpm build' d'abord.`);
  }

  const scripts = [
    ...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g),
  ].map((m) => m[1]);

  if (scripts.length === 0) fail(`aucun bloc JSON-LD dans ${htmlPath}`);

  let nodes = [];
  for (const s of scripts) {
    let parsed;
    try {
      parsed = JSON.parse(s);
    } catch (e) {
      fail(`JSON-LD non parsable (${htmlPath}): ` + e.message);
    }
    nodes = nodes.concat(Array.isArray(parsed) ? parsed : [parsed]);
  }

  for (const n of nodes) {
    if (!n["@context"]) fail(`nœud sans @context (${htmlPath}): ${JSON.stringify(n).slice(0, 80)}`);
    if (!n["@type"]) fail(`nœud sans @type (${htmlPath})`);
  }
  return nodes;
}

// ---------------------------------------------------------------------------
// 1. Homepage — SoftwareApplication + featureList ⊆ public_marketable.
// ---------------------------------------------------------------------------
const homeNodes = readNodes("out/index.html");

const homeBlob = JSON.stringify(homeNodes);
for (const re of FORBIDDEN) {
  if (re.test(homeBlob)) fail(`terme interdit détecté dans le JSON-LD homepage: ${re}`);
}

const app = homeNodes.find((n) => n["@type"] === "SoftwareApplication");
if (!app) fail("nœud SoftwareApplication absent (homepage)");
const features = app.featureList ?? [];
if (!Array.isArray(features) || features.length === 0) fail("featureList vide (homepage)");
for (const f of features) {
  if (!ALLOWED_FEATURES.has(f)) fail(`feature non public_marketable en featureList: "${f}"`);
}

const homeTypes = homeNodes.map((n) => n["@type"]).join(", ");
console.log(`✅ homepage : ${homeNodes.length} nœuds JSON-LD [${homeTypes}]`);
console.log(`✅ homepage : featureList (${features.length}) ⊆ public_marketable`);

// ---------------------------------------------------------------------------
// 2. Pages FAQ — Article honnête, SANS SoftwareApplication ni featureList.
//    Interdits explicites B8 : une capacité wip_committed_tested ne doit jamais
//    apparaître dans le balisage d'une application. La liste FORBIDDEN marketing
//    n'est PAS appliquée ici : le rôle de la FAQ est précisément d'énoncer la
//    limite ("does not verify claims"), formulation légitime sur cette surface.
// ---------------------------------------------------------------------------
const FAQ_DIR = "out/faq";
let faqFiles = [];
try {
  faqFiles = readdirSync(FAQ_DIR).filter((f) => f.endsWith(".html"));
} catch {
  faqFiles = [];
}

if (faqFiles.length === 0) {
  console.log("ℹ️  aucune page FAQ détaillée dans out/faq/ (rien à valider).");
} else {
  for (const file of faqFiles) {
    const p = path.join(FAQ_DIR, file);
    const nodes = readNodes(p);

    const article = nodes.find((n) => n["@type"] === "Article");
    if (!article) fail(`nœud Article absent (${p})`);

    if (nodes.some((n) => n["@type"] === "SoftwareApplication")) {
      fail(`SoftwareApplication interdit sur une page FAQ (${p})`);
    }
    if (nodes.some((n) => "featureList" in n)) {
      fail(`featureList interdit sur une page FAQ (${p})`);
    }
    for (const key of ["@id", "url", "headline"]) {
      if (!article[key]) fail(`Article sans ${key} (${p})`);
    }

    console.log(`✅ ${file} : Article valide, sans SoftwareApplication ni featureList`);
  }
}

console.log("✅ validation JSON-LD complète");
process.exit(0);
