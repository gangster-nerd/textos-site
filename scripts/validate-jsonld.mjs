// Gate CI/build (schema-map.spec.md §6, copy-safety-rules.spec.md §9) :
// extrait le JSON-LD de la homepage buildée et vérifie les invariants doctrinaux.
// Défense en profondeur : le validateur porte SA PROPRE copie des invariants ;
// si la page diverge, la CI échoue.

import { readFileSync } from "node:fs";

const HTML = "out/index.html";

// Seules ces features (public_marketable) peuvent apparaître en featureList.
const ALLOWED_FEATURES = new Set([
  "Authority Presence measurement",
  "Direct Share of Model",
  "Indirect Mention Share",
  "Total Authority Presence",
  "Measurement quality ledger",
]);

// Termes interdits (capability-registry.spec.md §6, copy-safety-rules.spec.md §4).
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

let html;
try {
  html = readFileSync(HTML, "utf8");
} catch {
  fail(`${HTML} introuvable — lance 'pnpm build' d'abord.`);
}

const scripts = [
  ...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g),
].map((m) => m[1]);

if (scripts.length === 0) fail("aucun bloc JSON-LD dans out/index.html");

let nodes = [];
for (const s of scripts) {
  let parsed;
  try {
    parsed = JSON.parse(s);
  } catch (e) {
    fail("JSON-LD non parsable: " + e.message);
  }
  nodes = nodes.concat(Array.isArray(parsed) ? parsed : [parsed]);
}

for (const n of nodes) {
  if (!n["@context"]) fail(`nœud sans @context: ${JSON.stringify(n).slice(0, 80)}`);
  if (!n["@type"]) fail("nœud sans @type");
}

const blob = JSON.stringify(nodes);
for (const re of FORBIDDEN) {
  if (re.test(blob)) fail(`terme interdit détecté dans le JSON-LD: ${re}`);
}

const app = nodes.find((n) => n["@type"] === "SoftwareApplication");
if (!app) fail("nœud SoftwareApplication absent");
const features = app.featureList ?? [];
if (!Array.isArray(features) || features.length === 0) fail("featureList vide");
for (const f of features) {
  if (!ALLOWED_FEATURES.has(f)) fail(`feature non public_marketable en featureList: "${f}"`);
}

const types = nodes.map((n) => n["@type"]).join(", ");
console.log(`✅ ${nodes.length} nœuds JSON-LD valides [${types}]`);
console.log(`✅ featureList (${features.length}) ⊆ public_marketable`);
console.log("✅ aucun terme interdit");
process.exit(0);
