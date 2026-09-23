// Fixture du récit de valeur (SITE-R1-VALUE-STORY-1) — ABSENCE → ACTION ÉDITORIALE → PRÉSENCE.
//
// Même univers illustratif que `product-proof/example.ts`, délibérément : la question suivie et la
// marque « Northwind Analytics » sont identiques, pour qu'un visiteur qui voit ce storyboard puis
// « Inside one measurement » plus bas reconnaisse le même exemple plutôt que d'en apprendre un
// second. La réponse de l'état PRESENT reprend d'ailleurs mot pour mot le texte de
// `EXAMPLE.observations[0].answer` de ce fichier — ce n'est pas une coïncidence, c'est la même
// observation racontée deux fois, à deux granularités.
//
// RÈGLE DE VÉRITÉ CARDINALE (mission SITE-R1-VALUE-STORY-1) : ce storyboard ne doit jamais laisser
// croire qu'une publication garantit une citation. `causalityDisclaimer` est le texte qui porte
// cette nuance ; il est un CHAMP DE DONNÉES, pas une légende que le composant pourrait omettre.

export type ValueStoryStepId = "absent" | "detect" | "write" | "present";

export interface ValueStoryFrame {
  id: ValueStoryStepId;
  /** Étiquette minimale affichée sous la scène — jamais un paragraphe. */
  label: string;
}

export const VALUE_STORY_FRAMES: readonly ValueStoryFrame[] = [
  { id: "absent", label: "Absent" },
  { id: "detect", label: "Opportunity detected" },
  { id: "write", label: "Write & publish" },
  { id: "present", label: "Presence observed" },
];

/** La marque suivie dans l'exemple — jamais une marque réelle, jamais un client. */
export const TRACKED_BRAND = "Northwind Analytics";

export const VALUE_STORY_ANSWER = {
  question: "Which vendors publish an independent security audit?",
  /** État ABSENT : la même question, une réponse réelle de moteur — mais sans la marque suivie. */
  before: {
    text: "Several vendors publish independent audit reports. Meridian Archive publishes a summary and provides the full report on request.",
    citations: [
      { sourceDomain: "meridian-archive.example", kind: "direct" as const },
    ],
  },
  /** État PRESENT : texte identique à `product-proof/example.ts` (observation "a"). */
  after: {
    text: "Several vendors publish independent audit reports. Northwind Analytics links its current report in full, naming the auditor. Meridian Archive publishes a summary and provides the full report on request.",
    citations: [
      { sourceDomain: "northwind-analytics.example", kind: "direct" as const, brand: true },
      { sourceDomain: "meridian-archive.example", kind: "direct" as const },
    ],
  },
} as const;

export const VALUE_STORY_DETECT_TEXT =
  `TextOS flags the gap: no citation for ${TRACKED_BRAND} on this question.`;

export const VALUE_STORY_WRITE_TEXT =
  "An evidence-backed article addressing the gap is drafted and published.";

export const VALUE_STORY_HEADLINE = "From absent to cited.";

export const VALUE_STORY_LEDE =
  "TextOS finds where your brand is missing, helps turn the gap into evidence-backed content, then measures whether your presence changed.";

/**
 * La nuance de causalité — CHAMP DE DONNÉES, pas une légende optionnelle. Aucune formulation
 * d'automatisme ("automatically", "guaranteed", "get cited") n'est admise ici ; vérifié par test.
 */
export const VALUE_STORY_CAUSALITY_DISCLAIMER =
  "Illustrative workflow, not a real run. Publishing does not guarantee a citation — TextOS re-measures whether presence was gained.";

// ── Invariants — mêmes garde-fous que product-proof/example.ts ─────────────────────────────────

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Fixture Value Story incohérente : ${message}`);
}

for (const c of [...VALUE_STORY_ANSWER.before.citations, ...VALUE_STORY_ANSWER.after.citations]) {
  assert(
    c.sourceDomain.endsWith(".example"),
    `source "${c.sourceDomain}" doit être un domaine .example (RFC 2606) — jamais une source d'apparence réelle.`
  );
}

assert(
  !VALUE_STORY_ANSWER.before.text.includes(TRACKED_BRAND),
  "l'état ABSENT ne doit pas nommer la marque suivie — sinon l'absence n'est pas visible."
);
assert(
  VALUE_STORY_ANSWER.after.text.includes(TRACKED_BRAND),
  "l'état PRESENT doit nommer la marque suivie — sinon la transformation n'est pas visible."
);
assert(
  VALUE_STORY_ANSWER.after.citations.some((c) => "brand" in c && c.brand),
  "l'état PRESENT doit porter une citation marquée comme appartenant à la marque suivie."
);

// Formulations d'AFFIRMATION de causalité — jamais la négation ("does not guarantee") que la
// nuance porte précisément. Une simple recherche de sous-chaîne sur "guarantee" aurait aussi
// rejeté sa propre négation ; c'est la phrase AFFIRMATIVE qui est interdite, pas le mot.
const FORBIDDEN_CAUSALITY_WORDING = [
  "automatically",
  "guaranteed citation",
  "get cited automatically",
  "makes chatgpt cite",
] as const;
const disclaimerLower = VALUE_STORY_CAUSALITY_DISCLAIMER.toLowerCase();
for (const phrase of FORBIDDEN_CAUSALITY_WORDING) {
  assert(
    !disclaimerLower.includes(phrase),
    `la nuance de causalité ne doit jamais contenir "${phrase}".`
  );
}
assert(
  disclaimerLower.includes("does not guarantee") || disclaimerLower.includes("no guarantee"),
  "la nuance de causalité doit NIER explicitement la garantie de citation, pas seulement l'omettre."
);
