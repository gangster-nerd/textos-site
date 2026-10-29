// Divulgation anticipée (ADR-032 du produit) — label et contrôle des promesses de disponibilité.
//
// Une page qui parle d'une capacité `public_beta` ou `public_upcoming` affiche son LABEL avant le
// contenu, et ne porte AUCUNE date ni promesse de disponibilité : le produit maîtrise son calendrier,
// il n'en promet aucun.
//
// Le contrôle des promesses est une COPIE du gate produit `early-disclosure-gate@1`
// (`textos-v0/src/server/textos/act/early-disclosure.ts`) : les deux dépôts n'ont pas de paquet
// partagé. Il est volontairement conservateur — un faux positif se corrige en réécrivant, une
// promesse publiée ne se rattrape pas.

import { disclosureObligations, type DisclosureObligations, type PublicationStatus } from "@/lib/product-manifest/status-axes";

export const AVAILABILITY_PROMISE_GATE_VERSION = "early-disclosure-gate@1" as const;

export interface EarlyDisclosure {
  readonly capabilityId: string;
  readonly label: DisclosureObligations["label"];
  readonly cta: DisclosureObligations["cta"];
}

export function earlyDisclosureOf(capabilityId: string, status: PublicationStatus): EarlyDisclosure | null {
  const obligations = disclosureObligations(status);
  return obligations ? { capabilityId, label: obligations.label, cta: obligations.cta } : null;
}

/** Libellé public, dans la langue de la page. */
export function earlyDisclosureLabel(label: EarlyDisclosure["label"], language: string): string {
  const fr = language.toLowerCase().startsWith("fr");
  if (label === "beta") return fr ? "Bêta" : "Beta";
  return fr ? "Bientôt" : "Coming soon";
}

/** Phrase d'accompagnement du label : elle dit ce que le statut permet, sans date. */
export function earlyDisclosureNote(label: EarlyDisclosure["label"], language: string): string {
  const fr = language.toLowerCase().startsWith("fr");
  if (label === "beta") {
    return fr
      ? "Fonctionnalité en bêta : l'accès est ouvert par l'équipe TextOS, organisation par organisation."
      : "This capability is in beta: the TextOS team opens access organisation by organisation.";
  }
  return fr
    ? "Fonctionnalité en construction : rien n'est encore accessible."
    : "This capability is being built: nothing is available yet.";
}

const MONTHS =
  "janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre|" +
  "january|february|march|april|may|june|july|august|september|october|november|december";

const RULES: readonly { readonly rule: string; readonly pattern: RegExp }[] = [
  { rule: "month_year", pattern: new RegExp(`\\b(?:${MONTHS})\\s+20\\d{2}\\b`, "giu") },
  { rule: "quarter_or_half", pattern: /\b(?:Q[1-4]|T[1-4]|H[12]|S[12])\s*20\d{2}\b/gu },
  { rule: "numeric_date", pattern: /\b\d{1,2}[/.]\d{1,2}[/.]20\d{2}\b|\b20\d{2}-\d{2}-\d{2}\b/gu },
  { rule: "deadline_fr", pattern: /\bd['’]ici\s+(?:la\s+)?(?:fin|20\d{2}|quelques|peu)\b/giu },
  {
    rule: "availability_fr",
    pattern: /\b(?:disponibles?|lancée?s?|ouverte?s?)\s+(?:dès|des|le|en|à partir|a partir|prochainement|bientôt|bientot|pour tous)\b/giu,
  },
  { rule: "general_availability_fr", pattern: /\bg[ée]n[ée]ralement\s+disponible/giu },
  { rule: "launch_fr", pattern: /\b(?:lancement|sortie|ouverture)\s+(?:le|en|prévue?|prevue?|programmée?)\b/giu },
  {
    rule: "availability_en",
    pattern: /\b(?:available|launch(?:es|ing)?|ships?|shipping|released?|rolls? out)\s+(?:now|today|on|in|from|by|next|soon|this)\b/giu,
  },
  { rule: "general_availability_en", pattern: /\bgenerally\s+available\b/giu },
  // « GA » seul, en majuscules : en minuscules, « ga » n'est pas une promesse.
  { rule: "general_availability_abbreviation", pattern: /\bGA\b/gu },
  { rule: "coming_en", pattern: /\bcoming\s+(?:in|on|by|this|next)\b/giu },
];

export interface AvailabilityPromise {
  readonly rule: string;
  readonly match: string;
  readonly where: string;
}

export function findAvailabilityPromises(texts: readonly { readonly where: string; readonly text: string }[]): AvailabilityPromise[] {
  const found: AvailabilityPromise[] = [];
  for (const { where, text } of texts) {
    for (const { rule, pattern } of RULES) {
      for (const match of text.matchAll(pattern)) found.push({ rule, match: match[0], where });
    }
  }
  return found;
}
