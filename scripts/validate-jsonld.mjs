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
    // A3R : unwrap @graph wrappers. A draft insight emits
    // { "@context": ..., "@graph": [Organization, WebPage] } — the graph
    // wrapper itself has no @type but every node inside does.
    const candidates = Array.isArray(parsed) ? parsed : [parsed];
    for (const c of candidates) {
      if (Array.isArray(c["@graph"])) {
        for (const child of c["@graph"]) {
          nodes.push({ "@context": c["@context"], ...child });
        }
      } else {
        nodes.push(c);
      }
    }
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
// 2. Pages de CONTENU — Article honnête, SANS SoftwareApplication ni featureList.
//    Interdits explicites B8 : une capacité wip_committed_tested ne doit jamais
//    apparaître dans le balisage d'une application. La liste FORBIDDEN marketing
//    n'est PAS appliquée ici : le rôle de la FAQ est précisément d'énoncer la
//    limite ("does not verify claims"), formulation légitime sur cette surface.
// ---------------------------------------------------------------------------
// DÉCOUVERTE, et non liste en dur. `out/faq` était codé ici : le cluster méthodologie exportait
// donc quatre pages porteuses de JSON-LD que RIEN ne validait. Une collection ajoutée doit être
// couverte par construction, sans qu'on ait à s'en souvenir — sinon la validation ne protège que ce
// qu'on a pensé à lui donner.
//
// Le critère est le même que celui du manifeste d'attribution : une collection est validée si sa
// route dynamique existe et qu'elle a produit du HTML.
const contentDirs = (() => {
  let collections = [];
  try {
    collections = readdirSync("content", { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort();
  } catch {
    return [];
  }
  return collections
    .map((name) => ({ name, dir: path.join("out", name) }))
    .filter(({ dir }) => {
      try {
        return readdirSync(dir).some((f) => f.endsWith(".html"));
      } catch {
        return false;
      }
    });
})();

const contentFiles = contentDirs.flatMap(({ name, dir }) =>
  readdirSync(dir)
    .filter((f) => f.endsWith(".html"))
    .sort()
    .map((file) => ({ collection: name, file, p: path.join(dir, file) }))
);

if (contentFiles.length === 0) {
  console.log("ℹ️  aucune page de contenu exportée (rien à valider).");
} else {
  for (const { collection, file, p } of contentFiles) {
    const nodes = readNodes(p);

    // A3R : an insight page is either PUBLISHED (Article node) or DRAFT
    // (WebPage node only, no Article). A CollectionPage represents an
    // insights index / topic hub. Any of these three shapes is legitimate ;
    // the invariant is "at least one page-level node" plus honesty about
    // publication (drafts NEVER carry Article + datePublished).
    const pageLevel = nodes.find((n) =>
      ["Article", "TechArticle", "BlogPosting", "WebPage", "CollectionPage"].includes(
        n["@type"],
      ),
    );
    if (!pageLevel) fail(`nœud page-level absent (Article/WebPage/CollectionPage) (${p})`);

    if (nodes.some((n) => n["@type"] === "SoftwareApplication")) {
      fail(`SoftwareApplication interdit sur une page de contenu (${p})`);
    }
    if (nodes.some((n) => "featureList" in n)) {
      fail(`featureList interdit sur une page de contenu (${p})`);
    }
    const isDraftPage = pageLevel["@type"] === "WebPage" && !pageLevel.datePublished;
    if (!isDraftPage && !pageLevel.headline && !pageLevel.name) {
      fail(`Nœud page-level sans headline/name (${p})`);
    }
    // Drafts MUST NOT leak datePublished / dateModified anywhere in the graph.
    if (isDraftPage) {
      const blob = JSON.stringify(nodes);
      if (/"datePublished"|"dateModified"/.test(blob)) {
        fail(`draft WebPage (${p}) émet datePublished/dateModified — draft ne doit pas publier de dates.`);
      }
    }
    const article = pageLevel; // for the origin/url check below

    // Auto-référence absolue (@id/url) OPTIONNELLE : présente seulement si
    // l'origine est réelle et indexable ; sinon la valeur inconnue se déclare
    // absente (jamais localhost ni URL qui 404). Si elle est là, elle ne doit
    // jamais pointer vers un tiers ni vers une origine provisoire.
    for (const key of ["@id", "url"]) {
      const v = article[key];
      if (v && /textos\.io|localhost|127\.0\.0\.1/i.test(v)) {
        fail(`Article ${key} pointe vers une origine interdite/provisoire : ${v} (${p})`);
      }
    }

    console.log(`✅ ${collection}/${file} : Article valide, sans SoftwareApplication ni featureList`);
  }
}

console.log("✅ validation JSON-LD complète");
process.exit(0);
