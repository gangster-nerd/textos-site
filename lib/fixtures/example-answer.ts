// Fixture de la carte de réponse du hero.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// POURQUOI LES DEUX ÉTATS PARTAGENT LEURS SOURCES
//
// La carte montre UNE réponse dans deux états : avant, la marque n'y est pas ; après, elle y est,
// avec sa source. Toute la démonstration tient dans le mot « même » — même question, même panel,
// même réponse. Si les sources non-marque changeaient entre les deux états, la carte montrerait
// deux réponses différentes, et la phrase « seule la preuve a changé » deviendrait fausse SANS que
// personne le voie. L'invariant est donc vérifié au chargement, exactement comme l'union l'est
// dans `example-measurement.ts`.
//
// TOUS LES HÔTES SONT SOUS `.example` (RFC 2606, TLD réservé). Aucune entreprise réelle n'est
// dépeinte, et aucun de ces domaines ne peut être enregistré par qui que ce soit. Un concurrent
// nommé dans une capture de produit serait un claim de marché : il exigerait une source gouvernée
// (copy-safety-rules.spec.md §4), qu'une carte d'illustration ne peut pas porter.
//
// La version du panel n'est pas déclarée ici : elle est LUE depuis la fixture de mesure. Le hero
// et le panneau « Authority Presence » plus bas sur la même page ne peuvent donc pas annoncer deux
// panels différents.
// ─────────────────────────────────────────────────────────────────────────────────────────────

import { exampleMeasurement } from "@/lib/fixtures/example-measurement";

export interface AnswerSource {
  /** Hôte cité, toujours sous `.example`. */
  host: string;
  /** Chemin affiché après l'hôte, quand la source est un document précis. */
  path?: string;
  /** La source est-elle celle de la marque du lecteur ? */
  brand: boolean;
}

export interface AnswerState {
  /** Le corps de la réponse, une phrase. */
  body: string;
  /** Sources citées, dans l'ordre où le moteur les nomme. */
  sources: readonly AnswerSource[];
}

const VENDOR_A: AnswerSource = { host: "vendor-a.example", brand: false };
const ROUNDUP: AnswerSource = { host: "roundup.example", brand: false };
const VENDOR_B: AnswerSource = { host: "vendor-b.example", brand: false };

const absent: AnswerState = {
  body: "The vendors referenced are Vendor A and Vendor B, both built around share-of-voice tracking.",
  sources: [VENDOR_A, ROUNDUP, VENDOR_B],
};

const cited: AnswerState = {
  body:
    "Your Brand is referenced for how it produces the measure — a versioned query panel, " +
    "reported with dispersion and completeness.",
  sources: [
    VENDOR_A,
    { host: "yourbrand.example", path: "/methodology", brand: true },
    ROUNDUP,
    VENDOR_B,
  ],
};

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Fixture de réponse incohérente : ${message}`);
}

const hosts = [...absent.sources, ...cited.sources].map((source) => source.host);
const nonBrand = (state: AnswerState) =>
  state.sources.filter((source) => !source.brand).map((source) => source.host);

assert(
  hosts.every((host) => host.endsWith(".example")),
  "tout hôte cité doit être sous le TLD réservé `.example` — nommer un domaine réel serait un claim de marché."
);
assert(
  absent.sources.every((source) => !source.brand),
  "l'état d'absence ne peut contenir aucune source de la marque : c'est ce qu'il démontre."
);
assert(
  cited.sources.filter((source) => source.brand).length === 1,
  "l'état de présence doit citer la marque UNE fois — deux citations raconteraient un autre résultat."
);
assert(
  nonBrand(absent).join("|") === nonBrand(cited).join("|"),
  "les sources non-marque doivent être identiques et dans le même ordre : sinon la carte montre deux réponses différentes, et « seule la preuve a changé » est faux."
);
assert(
  absent.body !== cited.body,
  "les deux corps de réponse doivent différer, sinon rien n'a changé."
);

export const exampleAnswer = {
  query: "which platforms measure brand citation in AI answers?",
  queryLabel: "Query 07",
  panelVersion: exampleMeasurement.panelVersion,
  absent,
  cited,
} as const;

export type ExampleAnswerView = typeof exampleAnswer;
