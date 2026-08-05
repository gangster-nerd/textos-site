// Provenance du contenu — un document doit désigner LES preuves qui soutiennent ce qu'il affirme.
//
// L'ancien `sourceCommit: z.string().min(7)` acceptait sept caractères quelconques. Il portait déjà
// deux sémantiques incompatibles dans le contenu rédigé — un SHA du dépôt produit pour la FAQ, un
// SHA du dépôt du SITE pour le cluster méthodologie — sans que rien ne le détecte.
//
// Et un commit unique ne PEUT PAS prouver les deux à quatre capacités qu'une page invoque. C'est
// l'implémentation qui a révélé la contrainte : d'où des références multiples, `capacite:bundle`,
// résolues contre le manifeste produit.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// CE QUI N'EST DÉLIBÉRÉMENT PAS FAIT : le balayage textuel des `prohibitedClaims`.
//
// La FAQ publiée existe précisément pour NIER que TextOS vérifie automatiquement les claims. Elle
// contient donc nécessairement les mots de l'interdiction. Un contrôle par sous-chaîne bloquerait le
// contenu le plus rigoureux du site et laisserait passer une paraphrase. Les interdictions sont
// REMONTÉES au rapport, attachées aux capacités invoquées, pour la revue humaine.
// ─────────────────────────────────────────────────────────────────────────────────────────────

import type { ManifestEntity, ProductManifest } from "./manifest-schema";

export type ProvenanceProblemKind =
  | "capability_unknown_to_manifest"
  | "evidence_ref_malformed"
  | "evidence_ref_unknown"
  | "evidence_ref_outside_declared_capabilities"
  | "capability_without_evidence"
  | "snapshot_mismatch";

export interface ProvenanceProblem {
  kind: ProvenanceProblemKind;
  severity: "blocking" | "report";
  message: string;
}

export interface ProvenanceCheck {
  contentId: string;
  productSnapshotSha: string;
  problems: ProvenanceProblem[];
  /** Interdictions portées par les capacités invoquées — à lire en revue éditoriale. */
  prohibitedClaims: string[];
  knownLimits: string[];
}

export interface ProvenanceInput {
  contentId: string;
  productSnapshotSha: string;
  evidenceRefs: readonly string[];
  capabilityIds: readonly string[];
}

const SEVERITY: Record<ProvenanceProblemKind, ProvenanceProblem["severity"]> = {
  capability_unknown_to_manifest: "blocking",
  evidence_ref_malformed: "blocking",
  evidence_ref_unknown: "blocking",
  evidence_ref_outside_declared_capabilities: "blocking",
  capability_without_evidence: "blocking",
  // Un document rédigé contre un snapshot antérieur est LÉGITIME : le contenu ne se réécrit pas à
  // chaque avancée du produit. Les identifiants de bundle étant stables par contrat, les références
  // restent vérifiables d'un snapshot à l'autre. On rapporte donc, sans bloquer.
  snapshot_mismatch: "report",
};

const problem = (kind: ProvenanceProblemKind, message: string): ProvenanceProblem => ({
  kind,
  severity: SEVERITY[kind],
  message,
});

function collect(entities: readonly ManifestEntity[], field: "prohibitedClaims" | "knownLimits") {
  return [...new Set(entities.flatMap((entity) => entity[field]))].sort();
}

/** Vérification PURE d'un document contre le manifeste épinglé. */
export function checkProvenance(
  input: ProvenanceInput,
  manifest: ProductManifest
): ProvenanceCheck {
  const byId = new Map(manifest.entities.map((entity) => [entity.id, entity]));
  const problems: ProvenanceProblem[] = [];

  const declared: ManifestEntity[] = [];
  for (const id of input.capabilityIds) {
    const entity = byId.get(id);
    if (entity) declared.push(entity);
    else {
      problems.push(
        problem(
          "capability_unknown_to_manifest",
          `Capacité invoquée absente du manifeste produit : "${id}".`
        )
      );
    }
  }

  if (input.productSnapshotSha !== manifest.snapshotCommit) {
    problems.push(
      problem(
        "snapshot_mismatch",
        `Rédigé contre le snapshot ${input.productSnapshotSha.slice(0, 7)}, le manifeste épinglé est ${manifest.snapshotCommit.slice(0, 7)} — références vérifiées contre le manifeste courant.`
      )
    );
  }

  const declaredIds = new Set(declared.map((entity) => entity.id));
  const backed = new Set<string>();

  for (const ref of input.evidenceRefs) {
    const [entityId, bundleId, ...rest] = ref.split(":");
    if (!entityId || !bundleId || rest.length > 0) {
      problems.push(
        problem("evidence_ref_malformed", `Référence de preuve malformée : "${ref}" (attendu "capacite:bundle").`)
      );
      continue;
    }

    const entity = byId.get(entityId);
    if (!entity || !entity.evidence.some((bundle) => bundle.id === bundleId)) {
      problems.push(
        problem(
          "evidence_ref_unknown",
          `Référence de preuve introuvable dans le manifeste : "${ref}".`
        )
      );
      continue;
    }

    // Une preuve qui ne concerne aucune des capacités invoquées ne soutient pas ce que le document
    // affirme : elle donnerait l'apparence d'une provenance sans en être une.
    if (!declaredIds.has(entityId)) {
      problems.push(
        problem(
          "evidence_ref_outside_declared_capabilities",
          `"${ref}" prouve "${entityId}", qui ne figure pas dans les capabilityIds du document.`
        )
      );
      continue;
    }

    backed.add(entityId);
  }

  // Chaque capacité invoquée doit être adossée à AU MOINS une preuve. C'est exactement ce qu'un
  // `sourceCommit` unique ne pouvait pas garantir pour un document multi-capacités.
  for (const entity of declared) {
    if (!backed.has(entity.id)) {
      problems.push(
        problem(
          "capability_without_evidence",
          `"${entity.id}" est invoquée sans aucune référence de preuve.`
        )
      );
    }
  }

  return {
    contentId: input.contentId,
    productSnapshotSha: input.productSnapshotSha,
    problems,
    prohibitedClaims: collect(declared, "prohibitedClaims"),
    knownLimits: collect(declared, "knownLimits"),
  };
}

export const blockingProblems = (check: ProvenanceCheck): ProvenanceProblem[] =>
  check.problems.filter((p) => p.severity === "blocking");

export const isProven = (check: ProvenanceCheck): boolean => blockingProblems(check).length === 0;
