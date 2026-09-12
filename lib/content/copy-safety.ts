// CTC-9-A runtime copy-safety gate — corrige la "spec-only" évoquée dans le README CTC-1.
//
// Contrat : pour tout article `editorialClass !== CURRENT_CAPABILITY`, refuser les termes qui
// impliquent une disponibilité produit non adossée à une capacité `public_marketable`.
//
// Les articles CURRENT_CAPABILITY restent gouvernés par le gate manifest classique
// (drift, claim-surface, prohibited claims). Le copy-safety ne se substitue PAS à ce gate.

const FORBIDDEN_AVAILABILITY_PHRASES = [
  "available now",
  "customers can",
  "customers now can",
  "we now offer",
  "textos supports",
  "textos now supports",
  "connect to",
  "activate",
  "production ready",
  "production-ready",
  "self-service",
  "self service",
  "self-serve",
  "sla",
  "in beta",
  "public beta",
  "early access",
  "sign up",
  "sign-up",
  "start free",
  "try free",
  "one-click",
  "one click",
] as const;

export interface CopySafetyFinding {
  phrase: string;
  offset: number;
  snippet: string;
}

export function scanForbiddenAvailabilityWording(body: string): CopySafetyFinding[] {
  const findings: CopySafetyFinding[] = [];
  const lower = body.toLowerCase();
  for (const phrase of FORBIDDEN_AVAILABILITY_PHRASES) {
    let idx = lower.indexOf(phrase);
    while (idx !== -1) {
      const start = Math.max(0, idx - 40);
      const end = Math.min(body.length, idx + phrase.length + 40);
      findings.push({
        phrase,
        offset: idx,
        snippet: `…${body.slice(start, end)}…`,
      });
      idx = lower.indexOf(phrase, idx + phrase.length);
    }
  }
  return findings;
}

export interface CopySafetyGateInput {
  editorialClass: string | undefined;
  body: string;
}

/**
 * Runtime gate : renvoie des findings quand `editorialClass !== CURRENT_CAPABILITY` et que le
 * corps contient un terme interdit. Les articles CURRENT_CAPABILITY ne sont PAS scannés ici —
 * leur gouvernance passe par le manifest gate + claims-registry.
 */
export function runCopySafetyGate(input: CopySafetyGateInput): CopySafetyFinding[] {
  if (input.editorialClass === "CURRENT_CAPABILITY" || input.editorialClass === undefined) {
    return [];
  }
  return scanForbiddenAvailabilityWording(input.body);
}

export const COPY_SAFETY_FORBIDDEN_PHRASES: readonly string[] = FORBIDDEN_AVAILABILITY_PHRASES;
