import { earlyDisclosureLabel, earlyDisclosureNote, type EarlyDisclosure } from "@/lib/content/early-disclosure";

// Label de divulgation anticipée (ADR-032) : il relativise TOUT ce qui suit, il se lit donc avant le
// contenu, au même rang que l'étiquette de maturité. Jamais dans un CTA.
export function EarlyDisclosureLabel({ disclosure, language }: { disclosure: EarlyDisclosure; language: string }) {
  const label = earlyDisclosureLabel(disclosure.label, language);
  return (
    <p className="doc__status" role="note" data-early-disclosure={disclosure.label}>
      <span className="data-label">{label}</span> {earlyDisclosureNote(disclosure.label, language)}
    </p>
  );
}

export default EarlyDisclosureLabel;
