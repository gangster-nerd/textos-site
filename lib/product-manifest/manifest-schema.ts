// Ingestion du manifeste de vérité produit.
//
// Le manifeste est produit par un autre dépôt, par une autre CI, à un autre rythme. Il entre donc
// ici comme une ENTRÉE NON FIABLE, au même titre qu'une réponse réseau — même si le fichier est
// commité. Le valider intégralement à la lecture est la seule façon d'empêcher qu'un champ renommé
// en amont ne devienne silencieusement `undefined` dans un gate en aval.
//
// `.strict()` partout, délibérément : un champ INCONNU fait échouer. C'est le comportement voulu —
// un champ ajouté en amont peut porter une restriction que ce dépôt ignorerait. Mieux vaut rougir
// et lire le nouveau champ que l'ignorer poliment.
//
// AUCUN ACCÈS AU DÉPÔT PRODUIT. Ce module lit deux fichiers de CE dépôt : la copie épinglée et son
// checksum. La copie provient de l'artefact émis par le run `push` sur `main` du produit — jamais
// d'un run de pull request, dont le `snapshotCommit` désigne un commit de fusion éphémère.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";

import {
  ENTITY_KINDS,
  IMPLEMENTATION_STATUSES,
  PUBLICATION_STATUSES,
  PUBLIC_SURFACES,
  SUPPORTED_SCHEMA_VERSION,
  SUPPORTED_VOCABULARY_VERSION,
} from "./status-axes";

const FullSha = z.string().regex(/^[0-9a-f]{40}$/, "SHA complet attendu (40 hex)");
const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "format attendu YYYY-MM-DD");

const EvidenceBundleSchema = z
  .object({
    id: z.string().min(1),
    commits: z.array(FullSha),
    paths: z.array(z.string().min(1)),
    tests: z.array(z.string().min(1)),
    adrs: z.array(z.string().min(1)),
  })
  .strict();

const EntitySchema = z
  .object({
    id: z.string().min(1),
    kind: z.enum(ENTITY_KINDS),
    implementationStatus: z.enum(IMPLEMENTATION_STATUSES).nullable(),
    publicationStatus: z.enum(PUBLICATION_STATUSES),
    allowedSurfaces: z.array(z.enum(PUBLIC_SURFACES)),
    publicationDecision: z
      .object({ decidedIn: z.string().min(1).nullable(), recordedAt: IsoDate.nullable() })
      .strict(),
    evidence: z.array(EvidenceBundleSchema),
    prohibitedClaims: z.array(z.string().min(1)),
    knownLimits: z.array(z.string().min(1)),
  })
  .strict();

const CoverageSchema = z.union([
  z.object({ kind: z.literal("complete") }).strict(),
  z.object({ kind: z.literal("partial"), note: z.string().min(1) }).strict(),
]);

export const ProductManifestSchema = z
  .object({
    schemaVersion: z.number().int(),
    statusVocabularyVersion: z.number().int(),
    productRepository: z.string().min(1),
    snapshotCommit: FullSha,
    snapshotCommittedAt: IsoDate,
    coverage: CoverageSchema,
    entities: z.array(EntitySchema).min(1),
  })
  .strict()
  .superRefine((manifest, ctx) => {
    // Refus PLUTÔT QU'interprétation partielle. Une version inconnue signifie qu'une forme ou un
    // statut peut exister en amont sans équivalent ici : le lire reviendrait à juger avec un
    // dictionnaire périmé. On préfère un build rouge et une lecture humaine.
    if (manifest.schemaVersion !== SUPPORTED_SCHEMA_VERSION) {
      ctx.addIssue({
        code: "custom",
        path: ["schemaVersion"],
        message: `Schéma non supporté : ${manifest.schemaVersion} (attendu ${SUPPORTED_SCHEMA_VERSION}).`,
      });
    }
    if (manifest.statusVocabularyVersion !== SUPPORTED_VOCABULARY_VERSION) {
      ctx.addIssue({
        code: "custom",
        path: ["statusVocabularyVersion"],
        message: `Vocabulaire non supporté : ${manifest.statusVocabularyVersion} (attendu ${SUPPORTED_VOCABULARY_VERSION}).`,
      });
    }

    const seenEntities = new Set<string>();
    for (const entity of manifest.entities) {
      if (seenEntities.has(entity.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["entities"],
          message: `Entité déclarée deux fois : ${entity.id}.`,
        });
      }
      seenEntities.add(entity.id);

      const seenBundles = new Set<string>();
      for (const bundle of entity.evidence) {
        if (seenBundles.has(bundle.id)) {
          ctx.addIssue({
            code: "custom",
            path: ["entities"],
            message: `${entity.id} : bundle "${bundle.id}" déclaré deux fois — une référence de preuve doit désigner une seule chose.`,
          });
        }
        seenBundles.add(bundle.id);
      }

      // Invariants que le produit tient déjà, revérifiés ici : ce dépôt n'a pas à faire confiance
      // à la CI d'un autre dépôt pour ses propres gates.
      if (entity.kind === "prohibited_concept" && entity.implementationStatus !== null) {
        ctx.addIssue({
          code: "custom",
          path: ["entities"],
          message: `${entity.id} : concept prohibé porteur d'un état d'avancement.`,
        });
      }
      if (entity.kind === "capability" && entity.implementationStatus === null) {
        ctx.addIssue({
          code: "custom",
          path: ["entities"],
          message: `${entity.id} : capacité sans état d'avancement.`,
        });
      }
    }
  });

export type ProductManifest = z.infer<typeof ProductManifestSchema>;
export type ManifestEntity = ProductManifest["entities"][number];

export const PINNED_MANIFEST_PATH = path.join(
  "product-manifest",
  "textos-v0.capability-manifest.json"
);
const PINNED_CHECKSUM_PATH = `${PINNED_MANIFEST_PATH}.sha256`;

/**
 * Lit, vérifie le checksum, puis valide. Lève avec un message lisible : un manifeste invalide n'a
 * pas de mode dégradé — tout gate qui s'appuierait dessus deviendrait faux.
 *
 * Le checksum n'est pas une redondance du contrôle de version de git : il prouve que la copie
 * épinglée est EXACTEMENT l'octet émis par la CI produit, et non un fichier réécrit à la main,
 * fusionné de travers, ou recopié depuis un autre run.
 */
export function loadPinnedManifest(root: string): ProductManifest {
  const file = path.join(root, PINNED_MANIFEST_PATH);

  let serialized: string;
  try {
    serialized = readFileSync(file, "utf8");
  } catch (error) {
    throw new Error(`Manifeste produit épinglé illisible (${PINNED_MANIFEST_PATH}) : ${(error as Error).message}`);
  }

  let expected: string;
  try {
    expected = readFileSync(path.join(root, PINNED_CHECKSUM_PATH), "utf8").trim().split(/\s+/)[0];
  } catch (error) {
    throw new Error(`Checksum du manifeste absent (${PINNED_CHECKSUM_PATH}) : ${(error as Error).message}`);
  }

  const actual = createHash("sha256").update(serialized).digest("hex");
  if (actual !== expected) {
    throw new Error(
      `Le manifeste épinglé ne correspond pas à son checksum.\n` +
        `  attendu ${expected}\n  obtenu  ${actual}\n` +
        `  La copie a été modifiée après émission — la réimporter depuis l'artefact du run push/main.`
    );
  }

  const parsed = ProductManifestSchema.safeParse(JSON.parse(serialized));
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "(racine)"} : ${issue.message}`)
      .join("\n");
    throw new Error(`Manifeste produit épinglé invalide :\n${details}`);
  }

  return parsed.data;
}

export function findEntity(manifest: ProductManifest, id: string): ManifestEntity | undefined {
  return manifest.entities.find((entity) => entity.id === id);
}
