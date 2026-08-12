// Le Product Proof montre la STRUCTURE de preuve réelle du produit avec des valeurs inventées.
// C'est un dispositif à deux dangers, et ces tests portent sur eux :
//
//   1. qu'une illustration finisse par se lire comme une mesure réelle ;
//   2. qu'une distinction de vérité s'aplatisse en chemin — « sans citation » confondu avec « non
//      observable », une absence rendue par un zéro, un état inconnu peint en échec.
//
// Les invariants de la fixture cassent déjà le build au chargement du module. Ce fichier éprouve ce
// que la fixture ne peut pas voir : le vocabulaire public, et le HTML réellement livré.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, test } from "vitest";

import { productProofExample, DESIGN_SNAPSHOT_SHA } from "@/lib/product-proof/example";
import {
  ANSWER_NOT_CAPTURED_LABEL,
  CITATION_KIND_LABEL,
  NEUTRAL_OBSERVATION_STATUSES,
  OBSERVATION_STATUS_LABEL,
} from "@/lib/product-proof/public-vocabulary";

const OUT = path.join(process.cwd(), "out");
const HOME_HTML = path.join(OUT, "index.html");

describe("fixture Product Proof", () => {
  test("la preuve publique est illustrative, jamais autre chose", () => {
    expect(productProofExample.proofKind).toBe("illustrative");
  });

  test("elle porte le SHA du contrat visuel, pas celui des capacités", () => {
    // Le SHA de design gouverne la grammaire reprise. Le snapshot produit (d1b8b50…) gouverne ce
    // que le site a le DROIT d'affirmer — deux provenances, jamais interchangeables.
    expect(productProofExample.designSnapshotSha).toBe(DESIGN_SNAPSHOT_SHA);
    expect(productProofExample.designSnapshotSha).not.toMatch(/^d1b8b50/);
  });

  test("aucun statut hors tonalité neutre : rien n'exige d'ambre ni de rouge", () => {
    for (const observation of productProofExample.observations) {
      expect(NEUTRAL_OBSERVATION_STATUSES).toContain(observation.status);
    }
  });

  test("les trois faits distincts sont présents, y compris les deux qu'on confond", () => {
    const cited = productProofExample.observations.find((o) => (o.citationCount ?? 0) > 0);
    const zeroCitations = productProofExample.observations.find(
      (o) => o.answer.kind === "captured" && o.citationCount === 0
    );
    const noAnswer = productProofExample.observations.find((o) => o.answer.kind === "absent");

    expect(cited).toBeDefined();
    expect(zeroCitations).toBeDefined();
    expect(noAnswer).toBeDefined();

    // LA distinction : une réponse capturée sans citation COMPTE zéro ; une réponse jamais produite
    // n'a rien à compter. Si les deux portaient `0`, la surface affirmerait un décompte qui n'a pas
    // eu lieu — le faux zéro que toute la doctrine du site refuse.
    expect(zeroCitations!.citationCount).toBe(0);
    expect(noAnswer!.citationCount).toBeNull();
  });

  test("toute source citée est un domaine fictif réservé à la documentation", () => {
    for (const citation of productProofExample.evidence.citations) {
      expect(citation.sourceDomain).toMatch(/\.example$/);
    }
  });
});

describe("vocabulaire public", () => {
  test("seuls les statuts neutres sont localisés", () => {
    // Les quatre autres statuts du produit ne sont pas absents par oubli : ils exigent une tonalité
    // ambre ou rouge dont la valeur sombre n'est pas ratifiée. Les localiser inviterait à les rendre.
    expect(Object.keys(OBSERVATION_STATUS_LABEL).sort()).toEqual(
      [...NEUTRAL_OBSERVATION_STATUSES].sort()
    );
  });

  test("aucun libellé public ne rapproche « no citation » de « not observable »", () => {
    const labels = [
      ...Object.values(OBSERVATION_STATUS_LABEL),
      ...Object.values(CITATION_KIND_LABEL),
      ANSWER_NOT_CAPTURED_LABEL,
    ];
    for (const label of labels) {
      expect(label.toLowerCase()).not.toContain("not observable");
      expect(label.toLowerCase()).not.toContain("unobservable");
    }
    expect(OBSERVATION_STATUS_LABEL.no_citations).toBe("No citation");
  });

  test("les libellés sont en anglais : aucun reste de la source française", () => {
    // Motifs propres au FRANÇAIS uniquement. « citation » seul serait un piège : il est identique
    // dans les deux langues, et « No citation » est précisément le libellé anglais attendu.
    const french = /Sans citation|Ignorée|Indéterminé|Délai|Réponse|Échec|déclenchée|Source directe|Mention indirecte/;
    for (const label of Object.values(OBSERVATION_STATUS_LABEL)) {
      expect(label).not.toMatch(french);
    }
    for (const label of Object.values(CITATION_KIND_LABEL)) {
      expect(label).not.toMatch(french);
    }
  });
});

// ── Ce qui est réellement livré. Le source peut rester convaincant pendant que la page ment. ────

describe("Product Proof dans l'export (post-build)", () => {
  test.skipIf(!existsSync(HOME_HTML))("la surface est étiquetée illustrative, deux fois", () => {
    const html = readFileSync(HOME_HTML, "utf8");
    expect(html).toContain("Illustrative");
    expect(html).toContain("Illustrative observation");
  });

  test.skipIf(!existsSync(HOME_HTML))("aucune formulation ne suggère une mesure réelle", () => {
    const html = readFileSync(HOME_HTML, "utf8").toLowerCase();
    for (const forbidden of [
      "real measurement",
      "live measurement",
      "real observation",
      "anonymized customer",
      "anonymised customer",
      "customer measurement",
    ]) {
      expect(html).not.toContain(forbidden);
    }
  });

  test.skipIf(!existsSync(HOME_HTML))("la grammaire produit est rendue, sans interaction simulée", () => {
    const html = readFileSync(HOME_HTML, "utf8");

    for (const column of ["Query", "Status", "Answer", "Cit.", "Evidence"]) {
      expect(html).toContain(column);
    }
    expect(html).toContain("Provenance");

    // Le rattachement ligne → Evidence est NARRATIF. Un état sélectionné, un `aria-current` ou un
    // lien mort seraient du faux chrome applicatif sur une surface qui n'a rien à actionner.
    expect(html).toContain("Shown below");
    expect(html).not.toContain('aria-current="true"');
    expect(html).not.toMatch(/class="[^"]*observations[^"]*"[^>]*href=/);
  });

  test.skipIf(!existsSync(HOME_HTML))("l'absence de décompte n'est pas rendue comme un zéro", () => {
    const html = readFileSync(HOME_HTML, "utf8");
    // La cellule sans surface de réponse porte le tiret ET son explication accessible : un lecteur
    // d'écran doit entendre « pas applicable », jamais un nombre.
    expect(html).toContain("not applicable — no answer surface to count citations from");
  });

  test.skipIf(!existsSync(HOME_HTML))("aucun faux accès produit ne subsiste ni ne le remplace", () => {
    const html = readFileSync(HOME_HTML, "utf8");
    expect(html).not.toContain("Se connecter");
    for (const fake of ["Log in", "Sign up", "Signup", "Try free", "Open TextOS", "Coming soon"]) {
      expect(html).not.toContain(fake);
    }
  });
});
