// Tests S3 — cluster public de méthodologie.
//
// Deux natures de vérification, à ne pas confondre : les contrats de REGISTRE (claims, capacités,
// visuels) et la DOCTRINE telle qu'elle est réellement écrite dans les pages. La seconde est la plus
// utile : un registre conforme n'empêche pas une phrase de contredire la méthode.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, test } from "vitest";

import { findCapability, isMarketableOn } from "@/lib/capability-registry";
import { CLAIMS, findClaim } from "@/lib/claims-registry";
import { loadCollection, loadDocument } from "@/lib/content/content-loader";
import { getVisual } from "@/lib/visuals/visual-registry";

const ROOT = process.cwd();
const SLUGS = [
  "authority-presence",
  "direct-indirect-total",
  "not-observable-is-not-zero",
  "measurement-quality-ledger",
] as const;
const METHODOLOGY_CLAIM_IDS = [
  "m1-observation-unit",
  "m2-direct-share-of-model",
  "m3-indirect-mention-share",
  "m4-total-is-a-union",
  "m5-not-observable-is-not-zero",
  "m6-quality-ledger-contextualises",
] as const;

const docs = () => loadCollection("methodology");
const body = (slug: string) => loadDocument("methodology", slug).body;

describe("claims et capacités", () => {
  test("les quatre pages chargent et passent les gates", () => {
    expect(docs()).toHaveLength(4);
    for (const slug of SLUGS) expect(() => loadDocument("methodology", slug)).not.toThrow();
  });

  test("chaque claim méthodologique existe et porte une capacité RÉELLE du registre", () => {
    for (const id of METHODOLOGY_CLAIM_IDS) {
      const claim = findClaim(id);
      expect(claim, `${id} introuvable`).toBeDefined();
      expect(claim!.capabilityId, `${id} sans capacité`).not.toBeNull();
      const capability = findCapability(claim!.capabilityId as string);
      expect(capability, `${id} → capacité inconnue « ${claim!.capabilityId} »`).toBeDefined();
    }
  });

  // La surface est explicite : ces pages sont des `product_article`. Asserter `isMarketable` seul
  // laisserait passer une capacité commercialisable ailleurs mais non revendiquée ICI — exactement
  // le trou que les helpers de surface ferment.
  test("chaque capacité utilisée est commercialisable SUR product_article", () => {
    for (const doc of docs()) {
      for (const capId of doc.frontmatter.capabilityIds) {
        const capability = findCapability(capId);
        expect(capability, `${capId} inconnue du registre`).toBeDefined();
        expect(
          isMarketableOn(capability!, "product_article"),
          `${capId} non commercialisable sur product_article (publication ${capability!.publicationStatus}, surfaces : ${capability!.claimedSurfaces.join(", ") || "aucune"})`
        ).toBe(true);
      }
    }
  });

  // Verrou de liste NOIRE, complémentaire du test de marketabilité ci-dessus : il nomme les
  // capacités qui ne doivent jamais atteindre un article produit, indépendamment de leur statut du
  // moment. Un changement de statut ne doit pas suffire à les y faire entrer.
  test("aucune capacité non commercialisable n'est publiée sur cette surface", () => {
    const forbidden = ["opportunity-brief", "truth-check", "repos-intersection", "authority-score", "claim-evidence-layer"];
    for (const doc of docs()) {
      for (const capId of doc.frontmatter.capabilityIds) {
        expect(forbidden, `${capId} ne doit pas être publiée`).not.toContain(capId);
      }
    }
  });

  test("chaque claim est autorisé sur la surface product_article", () => {
    for (const doc of docs()) {
      for (const id of doc.frontmatter.claimIds) {
        expect(findClaim(id)!.allowedSurfaces, `${id} interdit sur product_article`).toContain(
          "product_article"
        );
      }
    }
  });

  test("aucun claim sales_copy de S2A n'est utilisé par les articles", () => {
    const sales = CLAIMS.filter((c) => c.allowedSurfaces.includes("sales_copy")).map((c) => c.id);
    expect(sales.length).toBeGreaterThan(0);
    for (const doc of docs()) {
      for (const id of doc.frontmatter.claimIds) {
        expect(sales, `${id} est un claim commercial, hors article`).not.toContain(id);
      }
    }
  });

  test("les claims sales_copy restent limités à sales_copy", () => {
    for (const c of CLAIMS.filter((c) => c.id.startsWith("sales-"))) {
      expect(c.allowedSurfaces).toEqual(["sales_copy"]);
    }
  });

  test("HP1 et HP2 restent inchangés — capabilityId null, hors sales_copy", () => {
    for (const id of ["hp1-measurement-doctrine", "hp2-metric-integrity"]) {
      const c = findClaim(id)!;
      expect(c.capabilityId).toBeNull();
      expect(c.allowedSurfaces).not.toContain("sales_copy");
    }
  });
});

describe("doctrine — telle qu'écrite dans les pages", () => {
  test("la formule d'union est présente et explicite", () => {
    const pillar = body("authority-presence");
    const dit = body("direct-indirect-total");
    expect(pillar.toLowerCase()).toContain("union");
    expect(dit.toLowerCase()).toContain("union of direct and indirect");
    expect(dit).toMatch(/never (their|the) arithmetic sum|never their sum/i);
  });

  test("aucune formule additive Total = Direct + Indirect n'est affirmée", () => {
    for (const slug of SLUGS) {
      const text = body(slug);
      // On cherche une AFFIRMATION additive. Les mentions de refus (« 4 + 5 − 2 », « the arithmetic
      // sum would give ») sont légitimes et doivent rester possibles.
      expect(text, `${slug} : formule additive affirmée`).not.toMatch(
        /Total\s+(Authority\s+Presence\s+)?(is|=)\s+Direct\s*\+/i
      );
      expect(text, `${slug} : addition des deux parts présentée comme valide`).not.toMatch(
        /add(ing)?\s+the\s+two\s+shares\s+(gives|is|yields)\s+Total/i
      );
    }
  });

  test("l'exemple chiffré du chevauchement est arithmétiquement juste", () => {
    const text = body("direct-indirect-total");
    // 4 directes + 5 indirectes − 2 en chevauchement = 7 observations distinctes sur 10 → 70 %.
    expect(text).toContain("4 + 5 − 2 = 7");
    expect(text).toContain("70%");
    expect(text).toContain("90%");
    expect(text).toMatch(/exceed 100%/);
  });

  test("« not observable » n'est jamais assimilé à zéro", () => {
    const text = body("not-observable-is-not-zero");
    expect(text.toLowerCase()).toContain("never");
    expect(text).toMatch(/not observable/i);
    // Les quatre états sont nommés séparément.
    for (const state of ["Observed positive", "Observed zero", "Not observable", "Incomplete observation"]) {
      expect(text, `état manquant : ${state}`).toContain(state);
    }
    // Aucune page ne doit présenter une absence comme une valeur nulle.
    for (const slug of SLUGS) {
      expect(body(slug), `${slug}`).not.toMatch(
        /not observable\s+(is|means|=)\s+(a\s+)?zero|treated as zero|counted as zero/i
      );
    }
  });

  test("« Authority Score » n'apparaît que comme REFUS, jamais comme nom du produit", () => {
    for (const slug of SLUGS) {
      const text = body(slug);
      for (const m of text.matchAll(/[^.]*Authority Score[^.]*\./g)) {
        const sentence = m[0];
        expect(
          /\bno\b|\bnot\b|\bnever\b|\?$/i.test(sentence.trim()),
          `${slug} : « Authority Score » hors contexte de refus → ${sentence.trim()}`
        ).toBe(true);
      }
      // Jamais attribué au produit ni au lecteur.
      expect(text).not.toMatch(/(TextOS's|your|the)\s+Authority Score\s+(is|shows|rises)/i);
    }
  });

  test("les refus de recommandation, ROI, causalité et garanties sont maintenus", () => {
    const pillar = body("authority-presence");
    expect(pillar).toMatch(/no recommendations/i);
    expect(pillar).toMatch(/return-on-investment|ROI/i);
    expect(pillar).toMatch(/no guarantee of ranking/i);
    expect(pillar).toMatch(/presence, not causation/i);
    for (const slug of SLUGS) {
      const text = body(slug);
      expect(text, `${slug}`).not.toMatch(/we guarantee|guaranteed (ranking|citation|results)/i);
      expect(text, `${slug}`).not.toMatch(/Opportunity Brief/i);
    }
  });

  test("le panel versionné et l'unité d'observation sont énoncés", () => {
    const pillar = body("authority-presence");
    expect(pillar).toMatch(/versioned query panel/i);
    expect(pillar).toMatch(/one engine answer at a time|unit of measurement/i);
  });
});

describe("passages autonomes (GEO)", () => {
  const QUESTIONS: Array<[string, string]> = [
    ["authority-presence", "## What is Authority Presence?"],
    ["direct-indirect-total", "## What is Direct Share of Model?"],
    ["direct-indirect-total", "## What is Indirect Mention Share?"],
    ["direct-indirect-total", "## What is Total Authority Presence?"],
    ["direct-indirect-total", "## Why is Total not Direct plus Indirect?"],
    ["not-observable-is-not-zero", "## What does not observable mean?"],
    ["authority-presence", "## Is TextOS an Authority Score?"],
    ["measurement-quality-ledger", "## What does the Measurement Quality Ledger show?"],
  ];

  test.each(QUESTIONS)("%s porte la section « %s »", (slug, heading) => {
    expect(body(slug)).toContain(heading);
  });

  test("chaque définition nomme explicitement son sujet dans son premier paragraphe", () => {
    const expectations: Array<[string, string, string]> = [
      ["direct-indirect-total", "## What is Direct Share of Model?", "Direct Share of Model"],
      ["direct-indirect-total", "## What is Indirect Mention Share?", "Indirect Mention Share"],
      ["direct-indirect-total", "## What is Total Authority Presence?", "Total Authority Presence"],
      ["not-observable-is-not-zero", "## What does not observable mean?", "Not observable"],
      ["authority-presence", "## What is Authority Presence?", "Authority Presence"],
    ];
    for (const [slug, heading, subject] of expectations) {
      const text = body(slug);
      const first = text.slice(text.indexOf(heading) + heading.length).trim().split("\n\n")[0];
      expect(first.toLowerCase(), `${heading} ne nomme pas « ${subject} »`).toContain(
        subject.toLowerCase()
      );
      // Pas de renvoi opaque en ouverture de définition.
      expect(first, `${heading} renvoie ailleurs`).not.toMatch(/as (explained|described) above|see above/i);
    }
  });
});

describe("visuels", () => {
  test("les deux visuels sont enregistrés, approuvés et présents sur le disque", () => {
    for (const id of ["authority-presence-union-v1", "observability-states-v1"]) {
      const v = getVisual(id);
      expect(v, `${id} absent du registre`).toBeDefined();
      expect(v!.status).toBe("approved");
      expect(v!.alt.length).toBeGreaterThan(40);
      expect(v!.caption.length).toBeGreaterThan(20);
      const svg = readFileSync(path.join(ROOT, "public", v!.src), "utf8");
      expect(svg).toMatch(/<title[^>]*>[^<]+<\/title>/);
      expect(svg).toMatch(/<desc[^>]*>[^<]+<\/desc>/);
    }
  });

  test("les claims de chaque visuel sont déclarés par la page qui l'affiche", () => {
    for (const doc of docs()) {
      for (const visualId of doc.frontmatter.visualIds ?? []) {
        for (const claimId of getVisual(visualId)!.claimIds) {
          expect(doc.frontmatter.claimIds, `${doc.slug} : ${claimId} du visuel non déclaré`).toContain(
            claimId
          );
        }
      }
    }
  });

  test("le visuel d'union rend la lecture additive impossible", () => {
    const svg = readFileSync(
      path.join(ROOT, "public", "diagrams", "authority-presence-union-v1.svg"),
      "utf8"
    );
    expect(svg).toContain("∪");
    expect(svg).toMatch(/counted once|never twice/i);
    expect(svg).not.toMatch(/Direct \+ Indirect/);
  });

  test("le visuel d'observabilité ne représente pas « not observable » par un zéro", () => {
    const svg = readFileSync(
      path.join(ROOT, "public", "diagrams", "observability-states-v1.svg"),
      "utf8"
    );
    for (const state of ["observed", "positive", "zero", "not", "observable", "incomplete"]) {
      expect(svg.toLowerCase()).toContain(state);
    }
    // Le desc doit expliciter que « not observable » n'est pas une barre à zéro.
    expect(svg).toMatch(/not a bar at all|no baseline/i);
  });
});

describe("maillage interne", () => {
  test("la page pilier pointe vers les trois pages spécialisées", () => {
    const pillar = body("authority-presence");
    for (const slug of SLUGS.filter((s) => s !== "authority-presence")) {
      expect(pillar, `pilier → ${slug} manquant`).toContain(`/methodology/${slug}`);
    }
  });

  test("chaque page spécialisée pointe vers le pilier et vers une autre page méthodologique", () => {
    for (const slug of SLUGS.filter((s) => s !== "authority-presence")) {
      const text = body(slug);
      expect(text, `${slug} → pilier`).toContain("/methodology/authority-presence");
      const others = SLUGS.filter((s) => s !== slug && s !== "authority-presence");
      expect(
        others.some((o) => text.includes(`/methodology/${o}`)),
        `${slug} ne pointe vers aucune autre page spécialisée`
      ).toBe(true);
    }
  });

  test("le pilier relie observation et vérification via la FAQ existante", () => {
    expect(body("authority-presence")).toContain(
      "/faq/does-textos-automatically-verify-claims"
    );
  });

  test("tous les liens internes visent une route réelle", () => {
    const known = new Set([
      "/",
      "/faq/does-textos-automatically-verify-claims",
      ...SLUGS.map((s) => `/methodology/${s}`),
    ]);
    for (const slug of SLUGS) {
      for (const m of body(slug).matchAll(/\]\((\/[^)#]*)\)/g)) {
        expect(known, `${slug} : lien inconnu ${m[1]}`).toContain(m[1]);
      }
    }
  });
});

describe("CTA et frontmatter", () => {
  test("les quatre pages déclarent measurement_request et le cluster fermé", () => {
    for (const doc of docs()) {
      expect(doc.frontmatter.ctaVariant).toBe("measurement_request");
      expect(doc.frontmatter.clusterId).toBe("measurement-methodology");
      expect(doc.frontmatter.indexingPolicy).toBe("noindex");
      expect(doc.frontmatter.contentType).toBe("product_article");
    }
  });

  test("aucune copy de CTA n'est écrite dans le Markdown", () => {
    for (const slug of SLUGS) {
      const text = body(slug);
      for (const copy of ["See your brand measured", "Request a measurement", "Submit measurement request"]) {
        expect(text, `${slug} contient de la copy CTA`).not.toContain(copy);
      }
    }
  });

  test("un seul H1 par page — les titres de corps commencent à H2", () => {
    for (const slug of SLUGS) {
      expect(body(slug)).not.toMatch(/^# /m);
    }
  });
});

// ── Découvrabilité : un cluster maillé seulement depuis lui-même reste introuvable. ───────────
describe("maillage entrant vers la page pilier", () => {
  const HOMEPAGE = path.join(ROOT, "app", "page.tsx");
  const FAQ_ROUTE = path.join(ROOT, "app", "faq", "[slug]", "page.tsx");
  const PILLAR = "/methodology/authority-presence";

  // La homepage construit désormais ses liens de méthodologie DEPUIS les documents publiés, pour
  // ne pas maintenir une seconde vérité sur ses propres titres. Chercher une chaîne littérale dans
  // le source ne prouverait donc plus rien : le lien peut exister sans que le libellé y figure, et
  // le libellé pourrait y figurer sans que la page soit rendue.
  //
  // On vérifie ce qui compte réellement pour la découvrabilité : le HTML EXPORTÉ contient un lien
  // vers la page pilier. `skipIf` pour la même raison que les autres tests d'export — la séquence
  // de vérification lance vitest avant le build.
  const HOMEPAGE_HTML = path.join(ROOT, "out", "index.html");

  test.skipIf(!existsSync(HOMEPAGE_HTML))(
    "la homepage exportée pointe vers la page pilier",
    () => {
      const html = readFileSync(HOMEPAGE_HTML, "utf8");
      expect(html).toMatch(new RegExp(`href="${PILLAR}"`));
    }
  );

  test("la homepage lit ses liens de méthodologie depuis la collection", () => {
    // Verrou de non-régression : si quelqu'un revient à une liste en dur, le site porterait deux
    // vérités sur ses propres titres et l'une dériverait au premier changement.
    const src = readFileSync(HOMEPAGE, "utf8");
    expect(src).toContain('loadCollection("methodology")');
  });

  test("la FAQ pointe vers la page pilier depuis son bloc de maillage", () => {
    const src = readFileSync(FAQ_ROUTE, "utf8");
    expect(src).toContain(PILLAR);
    expect(src).toContain("How Authority Presence is measured");
    // Le lien vit dans le bloc éditorial final, pas ailleurs.
    const nav = src.slice(src.indexOf('aria-label="Related"'));
    expect(nav).toContain(PILLAR);
  });

  test("la cible du maillage est une route réellement exportée", () => {
    expect(loadDocument("methodology", "authority-presence").path).toBe(PILLAR);
  });

  test("le maillage n'introduit aucun claim ni capacité", () => {
    // Les liens sont éditoriaux : ils décrivent une destination, ils ne promettent rien. Aucun
    // identifiant de claim ou de capacité ne doit apparaître dans les deux fichiers de route.
    for (const file of [HOMEPAGE, FAQ_ROUTE]) {
      const src = readFileSync(file, "utf8");
      for (const forbidden of ["sales-authority", "m7-no-recommendations", "sales_copy"]) {
        expect(src, `${file} : ${forbidden}`).not.toContain(forbidden);
      }
    }
  });

  // DÉCISION INVERSÉE (S4) : la homepage porte désormais le CTA du registre, `homepage` ayant été
  // ajouté aux surfaces autorisées de `measurement_request`. Interdire `ContentCta` n'a donc plus
  // de sens — mais l'invariant qu'il protégeait, lui, reste entier : la page ne doit pas porter de
  // SECOND CTA, ni une proposition commerciale écrite en dur qui court-circuiterait le resolver.
  test("la homepage porte au plus un CTA, et il vient du resolver", () => {
    const src = readFileSync(HOMEPAGE, "utf8");

    // Un seul point de rendu.
    expect(src.match(/<ContentCta/g) ?? []).toHaveLength(1);

    // Il rend une variante RÉSOLUE, jamais celle demandée.
    expect(src).toContain("resolveCtaForSurface");
    expect(src).toContain("cta.resolvedVariant");

    // Aucune copy commerciale en dur : elle appartient au registre, qui la gouverne avec ses
    // claims. Une phrase écrite ici échapperait à ce contrôle.
    for (const copy of ["See your brand measured", "Request a measurement"]) {
      expect(src, `copy CTA écrite en dur sur la homepage : ${copy}`).not.toContain(copy);
    }

    // Et aucun lien direct vers la destination : il contournerait le resolver et apparaîtrait même
    // en mode `off`, où aucun CTA ne doit exister.
    expect(src).not.toContain('href="/request-measurement"');
  });
});

// ── Lisibilité mobile des visuels : invariant, pas vérification humaine. ──────────────────────
//
// Un SVG techniquement responsive dont les mots deviennent illisibles à 375 px ne remplit pas son
// rôle. `main` fait 46rem avec 1.5rem de padding : à 375 px de viewport, le contenu dispose de
// 327 px. La taille rendue d'un texte vaut donc font-size × (327 / largeur du viewBox).
describe("lisibilité mobile des visuels du cluster", () => {
  const MOBILE_CONTENT_WIDTH = 327;
  const MIN_RENDERED_PX = 10;

  test.each(["authority-presence-union-v1", "observability-states-v1"])(
    "%s reste lisible à 375 px",
    (id) => {
      const svg = readFileSync(path.join(ROOT, "public", getVisual(id)!.src), "utf8");
      const viewBoxWidth = Number(/viewBox="0 0 (\d+)/.exec(svg)![1]);
      const sizes = [...svg.matchAll(/font-size="(\d+)"/g)].map((m) => Number(m[1]));
      expect(sizes.length).toBeGreaterThan(0);
      const scale = MOBILE_CONTENT_WIDTH / viewBoxWidth;
      const smallest = Math.min(...sizes) * scale;
      expect(
        smallest,
        `${id} : plus petit texte rendu à ${smallest.toFixed(1)} px (viewBox ${viewBoxWidth}, échelle ${scale.toFixed(2)})`
      ).toBeGreaterThanOrEqual(MIN_RENDERED_PX);
    }
  );

  test("aucun visuel du cluster n'est déformé par une transformation non uniforme", () => {
    for (const id of ["authority-presence-union-v1", "observability-states-v1"]) {
      const svg = readFileSync(path.join(ROOT, "public", getVisual(id)!.src), "utf8");
      // scale(0.5 1) écraserait le texte horizontalement — illisible autrement.
      expect(svg, `${id}`).not.toMatch(/scale\(\s*[\d.]+\s+[\d.]+\s*\)/);
    }
  });
});
