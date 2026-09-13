// Registre AUTEURS + REVIEWERS — validé par Zod au chargement. Un mal formé fait échouer
// le build.
//
// Contrat CTC-ARTICLE-SYSTEM-1 : chaque article /insights doit déclarer un `authorId` et
// éventuellement des `reviewerIds`, tous deux résolus contre ce registre. Aucune auteur ad-hoc
// dans le frontmatter d'un fichier — un nouvel auteur exige une PR sur ce registre.

import { z } from "zod";

export const PersonSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/, "kebab-case attendu"),
    name: z.string().min(1),
    role: z.string().min(1),
    // URL relative interne uniquement (ex. "/team/marc"). Absente si aucune page n'existe.
    profilePath: z.string().regex(/^\/[a-z0-9/-]*$/).optional(),
    // Identités externes stables (URL du site officiel + optionnels sameAs). Toutes valides
    // pour JSON-LD Person.sameAs.
    sameAs: z.array(z.string().url()).optional(),
  })
  .strict();

export type Person = z.infer<typeof PersonSchema>;

const RAW: Person[] = [
  {
    id: "textos-editorial-team",
    name: "TextOS Editorial Team",
    role: "Product Editorial",
    sameAs: [],
  },
  {
    id: "marc-p",
    name: "Marc P.",
    role: "Founder & CPO",
    sameAs: [],
  },
];

export const PEOPLE: readonly Person[] = RAW.map((p) => PersonSchema.parse(p));

export function findPerson(id: string): Person | undefined {
  return PEOPLE.find((p) => p.id === id);
}

export const PERSON_IDS: readonly string[] = PEOPLE.map((p) => p.id);
