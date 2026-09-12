// Déclarations ÉDITORIALES de maturité — décisions CPO, propres à ce dépôt site.
//
// Chaque entrée est une PROPOSITION de communication publique. La maturité EFFECTIVE est
// calculée par `reconcileMaturity` en fonction du plafond imposé par le manifeste produit.
// Une entrée qui propose PUBLIC_BETA alors que le manifeste dit internal_only sera CLAMPED à
// INTERNAL_LABS — c'est explicite dans le rapport de bundle.
//
// Cette liste évolue par revue PO/CPO. Chaque entrée exige des `evidenceRefs` — commits ou
// paths qui attestent l'implémentation. Une entrée sans preuve est refusée par le schéma.
//
// Aucune entrée ci-dessous n'est un HYPOTHÈSE : elles sont ancrées sur l'audit produit fait
// pendant le sprint CTC-1 (voir Explore report). Zendesk / Yext / Salesforce / HubSpot ne
// figurent PAS ici : l'audit n'a trouvé AUCUNE preuve d'implémentation. Ne pas inventer.

import { z } from "zod";

import { PUBLIC_MATURITY } from "./maturity";

export const MaturityDeclarationSchema = z
  .object({
    capabilityId: z.string().min(1), // clé libre — n'a PAS besoin d'exister dans le manifeste ;
                                     // les capacités "labs" peuvent ne pas encore y être déclarées
    proposedMaturity: z.enum(PUBLIC_MATURITY),
    label: z.string().min(1),
    surface: z.enum(["labs", "product_proof", "faq", "roadmap"]),
    evidenceRefs: z.array(z.string().min(1)).min(1), // commits, ADR ids, ou paths
    publicWording: z.string().min(1),
    prohibitedWording: z.array(z.string().min(1)),
    cta: z.enum(["measurement_request", "contact", "labs_signup", "none"]),
    // Champ documentaire libre — pourquoi cette proposition tient la route.
    rationale: z.string().min(1),
  })
  .strict();

export type MaturityDeclaration = z.infer<typeof MaturityDeclarationSchema>;

const RAW: MaturityDeclaration[] = [
  {
    capabilityId: "wordpress-publication",
    proposedMaturity: "PUBLIC_BETA",
    label: "WordPress publication",
    surface: "labs",
    evidenceRefs: [
      "src/server/textos/act/providers/wordpress/index.ts",
      "src/server/textos/act/publication.ts",
      "ADR-016 (S12 graduated publication)",
    ],
    publicWording:
      "Publish TextOS-generated drafts into your WordPress site. Available for selected design partners; contact us to activate.",
    prohibitedWording: [
      "one-click publishing",
      "auto-publish",
      "GA-level reliability",
      "production-scale SLA",
    ],
    cta: "contact",
    rationale:
      "Provider WordPress implémenté offline, receipt honnête (observed/ambiguous), test-connection + create-draft + read-status. Publication automatique NON exposée. Un client peut recevoir un draft demain avec du support manuel.",
  },
  {
    capabilityId: "native-composition-gutenberg",
    proposedMaturity: "PUBLIC_EARLY_ACCESS",
    label: "Native Composition (Gutenberg V0.1)",
    surface: "labs",
    evidenceRefs: [
      "src/server/textos/act/native-composition/gutenberg-serializer.ts",
      "src/server/textos/act/native-composition/gutenberg-vocabulary.ts",
      "gutenberg-parity tests",
    ],
    publicWording:
      "Emit blocks native to your CMS composer (Gutenberg V0.1 subset). Early access with design partners; manual activation.",
    prohibitedWording: [
      "universal composer compatibility",
      "self-service integration",
      "supports every WordPress theme",
    ],
    cta: "labs_signup",
    rationale:
      "Vocabulaire V0.1 stable (heading/paragraph/separator), parity tests verrouillent la sortie. Aucun API public. Early-access via ingénierie manuelle.",
  },
  {
    capabilityId: "asset-spec",
    proposedMaturity: "INTERNAL_LABS",
    label: "AssetSpec — surface asset specification",
    surface: "labs",
    evidenceRefs: [
      "src/server/textos/act/asset-spec/*",
      "ADR-021",
      "2026-08-25-asset-spec-2 change entry",
    ],
    publicWording:
      "Internal capability: TextOS derives an owned-surface asset specification before generating any change. Not a customer-facing feature.",
    prohibitedWording: ["available", "beta", "buy", "sign up"],
    cta: "none",
    rationale:
      "90 tests ciblés, ADR-021, mais aucun chemin produit ne l'atteint (no_public_content). Digne d'être raconté en Labs / how-we-build, pas vendu.",
  },
  {
    capabilityId: "geo-writer",
    proposedMaturity: "INTERNAL_LABS",
    label: "GEO Writer — grounded slot-by-slot writing",
    surface: "labs",
    evidenceRefs: [
      "src/server/textos/act/geo-writer/*",
      "2026-08-24-geo-writer-1 change entry",
    ],
    publicWording:
      "Internal capability: TextOS composes evidence-grounded content slot by slot. Not exposed as a customer feature.",
    prohibitedWording: ["available", "beta", "buy", "sign up"],
    cta: "none",
    rationale:
      "Coeur générateur prouvé (32+ tests), zéro chemin d'exécution produit. Labs uniquement.",
  },
  {
    capabilityId: "owned-surface-design",
    proposedMaturity: "INTERNAL_LABS",
    label: "Owned-surface design observation",
    surface: "labs",
    evidenceRefs: [
      "src/server/textos/observe/owned-surface-design/*",
      "ADR-021",
    ],
    publicWording:
      "Internal capability: TextOS reads the block composition of your owned surface (Gutenberg, Elementor) as observed structure — not opinion.",
    prohibitedWording: ["renders your site", "modifies your site"],
    cta: "none",
    rationale:
      "Primitive d'observation pure, prérequis d'AssetSpec / GeoWriter. Bonne matière Labs / how-we-build.",
  },
  {
    capabilityId: "query-intelligence",
    proposedMaturity: "PUBLIC_ROADMAP",
    label: "Query Intelligence — demand & buyer-intent evidence",
    surface: "roadmap",
    evidenceRefs: [
      "src/server/textos/query-intelligence/*",
      "coverage.test.ts declaration_debt",
    ],
    publicWording:
      "Planned: TextOS is preparing a public capability for demand & buyer-intent evidence on your query panel.",
    prohibitedWording: ["available", "beta", "buy", "sign up"],
    cta: "contact",
    rationale:
      "Cinq modules réels, tests passants, mais entité NON déclarée au manifeste (declaration_debt). Roadmap crédible, pas plus.",
  },
  {
    capabilityId: "opportunity-brief",
    proposedMaturity: "INTERNAL_LABS",
    label: "Opportunity Brief — fixture-first opportunity judgment",
    surface: "labs",
    evidenceRefs: ["src/server/textos/decide/opportunity-brief.ts", "ADR-014"],
    publicWording:
      "Internal capability: TextOS produces opportunity briefs for human editorial judgment. Not automated action.",
    prohibitedWording: [
      "automatically prioritizes actions",
      "tells you what content to write",
    ],
    cta: "none",
    rationale:
      "Implémenté mais explicitement non marketable (ADR-014 + prohibitedClaims manifeste). Labs uniquement pour éviter tout malentendu d'automatisation.",
  },
  {
    capabilityId: "repos-intersection",
    proposedMaturity: "INTERNAL_LABS",
    label: "Repos Intersection (premium foundation)",
    surface: "labs",
    evidenceRefs: ["src/server/textos/premium/repos-intersection.ts", "ADR-017"],
    publicWording:
      "Internal capability: TextOS aligns evidence across multiple repositories for premium tiers.",
    prohibitedWording: ["available", "beta", "buy", "sign up"],
    cta: "none",
    rationale:
      "Fondation premium, fixture-first. Labs seulement — pas de surface publique.",
  },
  {
    capabilityId: "commit-to-content",
    proposedMaturity: "INTERNAL_LABS",
    label: "Commit to Content (this pipeline)",
    surface: "labs",
    evidenceRefs: [
      "textos-site: lib/commit-to-content/*",
      "textos-site: scripts/content-{sync,verify,status}.ts",
      "textos-site: docs/commit-to-content-v1.md",
    ],
    publicWording:
      "How we build TextOS content: an internal system turns verified product development and GitHub history into governed marketing content. Dogfooded across TextOS, ShortsOS, RepOS.",
    prohibitedWording: [
      "available",
      "customer feature",
      "buy",
      "sign up",
      "one-click",
      "TextOS feature",
    ],
    cta: "none",
    rationale:
      "Décision CPO du 2026-09-12 : commit-to-content EST INTERNAL_LABS. Pas de promesse d'accès client. Peut être raconté en Labs / how-we-build.",
  },
];

// Validation au chargement du module — un mal formé fait échouer le build.
export const MATURITY_DECLARATIONS: readonly MaturityDeclaration[] = RAW.map((d) =>
  MaturityDeclarationSchema.parse(d),
);
