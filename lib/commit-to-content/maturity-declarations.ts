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

import { existsSync } from "node:fs";
import path from "node:path";
import { z } from "zod";

import { DISCLOSURE_AUTHORITIES, PUBLIC_MATURITY, STORY_KINDS } from "./maturity";

const COMPANY_TECHNOLOGY_ALLOWED_MATURITY = new Set<string>([
  "INTERNAL_LABS",
  "PRIVATE",
  "FORBIDDEN",
]);

function siteRoot(): string {
  // maturity-declarations.ts vit sous lib/commit-to-content/ ; racine = ../..
  return path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..");
}

export const MaturityDeclarationSchema = z
  .object({
    capabilityId: z.string().min(1),
    proposedMaturity: z.enum(PUBLIC_MATURITY),
    // Troisième axe. Absence d'autorité → aucune divulgation publique quel que soit la maturité.
    disclosureAuthority: z.enum(DISCLOSURE_AUTHORITIES),
    // Nature du récit — gouvernance différente selon le kind.
    storyKind: z.enum(STORY_KINDS),
    label: z.string().min(1),
    surface: z.enum(["labs", "product_proof", "faq", "roadmap"]),
    evidenceRefs: z.array(z.string().min(1)).min(1),
    publicWording: z.string().min(1),
    prohibitedWording: z.array(z.string().min(1)),
    cta: z.enum(["measurement_request", "contact", "labs_signup", "none"]),
    rationale: z.string().min(1),
    // Piste d'audit obligatoire quand disclosureAuthority = CPO_DISCLOSURE_APPROVED.
    disclosureDecisionRef: z.string().min(1).nullable(),
  })
  .strict()
  .superRefine((d, ctx) => {
    if (d.disclosureAuthority === "CPO_DISCLOSURE_APPROVED" && !d.disclosureDecisionRef) {
      ctx.addIssue({
        code: "custom",
        path: ["disclosureDecisionRef"],
        message: "CPO_DISCLOSURE_APPROVED exige une trace de décision durable (disclosureDecisionRef).",
      });
    }
    if (d.storyKind === "COMPANY_TECHNOLOGY" && d.cta !== "none") {
      ctx.addIssue({
        code: "custom",
        path: ["cta"],
        message: "Une COMPANY_TECHNOLOGY story ne peut porter aucun CTA de vente.",
      });
    }
    // Plafond terminal : COMPANY_TECHNOLOGY ne peut PROPOSER que INTERNAL_LABS / PRIVATE /
    // FORBIDDEN. Toute promotion commerciale exige une requalification PRODUCT_CAPABILITY et
    // une gouvernance manifeste. Rejet au schéma pour empêcher toute dérive silencieuse.
    if (
      d.storyKind === "COMPANY_TECHNOLOGY" &&
      !COMPANY_TECHNOLOGY_ALLOWED_MATURITY.has(d.proposedMaturity)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["proposedMaturity"],
        message: `COMPANY_TECHNOLOGY est terminalement plafonnée à INTERNAL_LABS ; ${d.proposedMaturity} exige une requalification storyKind=PRODUCT_CAPABILITY.`,
      });
    }
    // La trace de décision CPO doit pointer un fichier réel du dépôt.
    if (d.disclosureAuthority === "CPO_DISCLOSURE_APPROVED" && d.disclosureDecisionRef) {
      // On accepte deux formats : soit un chemin `docs/decisions/*.md` réel, soit un
      // identifiant textuel ; on valide UNIQUEMENT les chemins.
      const looksLikePath = d.disclosureDecisionRef.startsWith("docs/");
      if (looksLikePath) {
        const abs = path.join(siteRoot(), d.disclosureDecisionRef);
        if (!existsSync(abs)) {
          ctx.addIssue({
            code: "custom",
            path: ["disclosureDecisionRef"],
            message: `Fichier de décision introuvable : ${d.disclosureDecisionRef}.`,
          });
        }
      }
    }
  });

export type MaturityDeclaration = z.infer<typeof MaturityDeclarationSchema>;

// Défaut : PRODUCT_CAPABILITY sans autorité de divulgation explicite. Les histoires
// technologiques d'entreprise doivent être marquées explicitement COMPANY_TECHNOLOGY +
// CPO_DISCLOSURE_APPROVED, avec une trace de décision datée.
const RAW: MaturityDeclaration[] = [
  {
    capabilityId: "wordpress-publication",
    storyKind: "PRODUCT_CAPABILITY",
    disclosureAuthority: "NONE", // aucune décision produit encore
    disclosureDecisionRef: null,
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
      "Provider WordPress implémenté offline, receipt honnête. Aucune décision produit publique encore : ni entrée manifeste, ni approbation CPO datée. Reste PRIVATE.",
  },
  {
    capabilityId: "native-composition-gutenberg",
    storyKind: "PRODUCT_CAPABILITY",
    disclosureAuthority: "NONE",
    disclosureDecisionRef: null,
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
      "Vocabulaire V0.1 prouvé (parity tests). Aucune décision produit. Reste PRIVATE.",
  },
  {
    capabilityId: "asset-spec",
    storyKind: "PRODUCT_CAPABILITY",
    disclosureAuthority: "NONE",
    disclosureDecisionRef: null,
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
    rationale: "90 tests ciblés. Aucune décision produit publique. Reste PRIVATE.",
  },
  {
    capabilityId: "geo-writer",
    storyKind: "PRODUCT_CAPABILITY",
    disclosureAuthority: "NONE",
    disclosureDecisionRef: null,
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
    rationale: "Coeur générateur prouvé. Aucune décision produit publique. Reste PRIVATE.",
  },
  {
    capabilityId: "owned-surface-design",
    storyKind: "PRODUCT_CAPABILITY",
    disclosureAuthority: "NONE",
    disclosureDecisionRef: null,
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
    rationale: "Primitive d'observation pure. Aucune décision produit publique. Reste PRIVATE.",
  },
  {
    capabilityId: "query-intelligence",
    storyKind: "PRODUCT_CAPABILITY",
    disclosureAuthority: "NONE",
    disclosureDecisionRef: null,
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
      "Cinq modules réels, tests passants, mais entité NON déclarée au manifeste (declaration_debt). Reste PRIVATE tant qu'aucune approbation.",
  },
  {
    capabilityId: "opportunity-brief",
    storyKind: "PRODUCT_CAPABILITY",
    // Le manifeste dit internal_only. Le sprint CTC-5 précise EXPLICITEMENT que
    // `internal_only` n'est PAS une autorité de divulgation. Donc NONE.
    disclosureAuthority: "NONE",
    disclosureDecisionRef: null,
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
      "Implémenté mais internal_only (ADR-014). internal_only ≠ autorité publique — reste PRIVATE tant qu'aucune décision CPO.",
  },
  {
    capabilityId: "repos-intersection",
    storyKind: "PRODUCT_CAPABILITY",
    disclosureAuthority: "NONE",
    disclosureDecisionRef: null,
    proposedMaturity: "INTERNAL_LABS",
    label: "Repos Intersection (premium foundation)",
    surface: "labs",
    evidenceRefs: ["src/server/textos/premium/repos-intersection.ts", "ADR-017"],
    publicWording:
      "Internal capability: TextOS aligns evidence across multiple repositories for premium tiers.",
    prohibitedWording: ["available", "beta", "buy", "sign up"],
    cta: "none",
    rationale:
      "Fondation premium interne. internal_only ≠ autorité publique — reste PRIVATE.",
  },
  {
    capabilityId: "commit-to-content",
    storyKind: "COMPANY_TECHNOLOGY",
    // SEULE déclaration avec autorité de divulgation explicite : décision CPO datée du
    // 2026-09-12 autorisant un récit Labs/how-we-build.
    disclosureAuthority: "CPO_DISCLOSURE_APPROVED",
    disclosureDecisionRef: "docs/decisions/CPO-2026-09-12-commit-to-content-disclosure.md",
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
      "COMPANY_TECHNOLOGY story approuvée CPO. Peut être racontée en surface restreinte Labs/how-we-build. N'EST PAS une capacité produit TextOS.",
  },
];

// Validation au chargement du module — un mal formé fait échouer le build.
export const MATURITY_DECLARATIONS: readonly MaturityDeclaration[] = RAW.map((d) =>
  MaturityDeclarationSchema.parse(d),
);
