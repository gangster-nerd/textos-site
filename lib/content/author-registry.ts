// Registre AUTEURS + REVIEWERS — validé par Zod au chargement. Un mal formé fait échouer
// le build.
//
// Contrat CTC-ARTICLE-SYSTEM-1 : chaque article /insights doit déclarer un `authorId` et
// éventuellement des `reviewerIds`, tous deux résolus contre ce registre. Aucune auteur ad-hoc
// dans le frontmatter d'un fichier — un nouvel auteur exige une PR sur ce registre.

import { z } from "zod";

// CTO §9 : distinguer Person (humain nommé) et Organization (entité éditoriale collective).
// Seuls les Person peuvent apparaître comme reviewers ; un authorId peut pointer vers l'un
// ou l'autre. Le JSON-LD émet @type=Person ou @type=Organization selon entityType.
export const ENTITY_TYPES = ["Person", "Organization"] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

export const EntitySchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/, "kebab-case attendu"),
    entityType: z.enum(ENTITY_TYPES),
    name: z.string().min(1),
    role: z.string().min(1),
    // URL relative interne UNIQUEMENT — et seulement si la page existe réellement. Le
    // rendu n'émettra un href/url qu'une fois `allowIndexing` vrai ET ce champ posé.
    profilePath: z.string().regex(/^\/[a-z0-9/-]*$/).optional(),
    sameAs: z.array(z.string().url()).optional(),
  })
  .strict();

// Alias rétro-compatible — les consommateurs qui importaient `Person`/`PersonSchema`
// continuent de fonctionner. Le nouveau nom canonique est `Entity`.
export const PersonSchema = EntitySchema;
export type Entity = z.infer<typeof EntitySchema>;
export type Person = Entity;

const RAW: Entity[] = [
  {
    id: "textos-editorial-team",
    entityType: "Organization",
    name: "TextOS Editorial Team",
    role: "Product Editorial",
  },
  {
    id: "marc-p",
    entityType: "Person",
    name: "Marc P.",
    role: "Founder & CPO",
  },
];

export const PEOPLE: readonly Entity[] = RAW.map((p) => EntitySchema.parse(p));

export function findPerson(id: string): Entity | undefined {
  return PEOPLE.find((p) => p.id === id);
}

/** All registered entity ids (Person + Organization). Use for authorId membership. */
export const PERSON_IDS: readonly string[] = PEOPLE.map((p) => p.id);

/**
 * IDs of registered humans only. Reviewers MUST be humans — an "organization reviewed
 * this" claim would hide that no named human ever read the draft.
 */
export const PERSON_ENTITY_IDS: readonly string[] = PEOPLE.filter(
  (p) => p.entityType === "Person",
).map((p) => p.id);

/** IDs of organization-typed entities (for tests / registry inspection). */
export const ORG_ENTITY_IDS: readonly string[] = PEOPLE.filter(
  (p) => p.entityType === "Organization",
).map((p) => p.id);
