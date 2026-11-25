// Libellés FRANÇAIS de la page d'accueil (décision de Marc du 25/11/2026 : « go pour le haut de page et la
// version française »). Le registre de capacités reste la seule source de ce qui est commercialisable ; ce
// fichier n'en donne que la TRADUCTION, et un test exige un libellé français pour chaque capacité affichée sur
// la page d'accueil (aucune ligne anglaise ne réapparaît en silence au premier ajout au registre).
import type { CapabilityId } from "@/lib/capability-registry";

export const FR_CAPABILITY_LABELS: Partial<Record<CapabilityId, string>> = {
  "observe-authority-presence": "Mesure de la présence d'autorité",
  "direct-share-of-model": "Part de citation directe (Direct Share of Model)",
  "indirect-mention-share": "Part de mention indirecte (Indirect Mention Share)",
  "total-authority-presence": "Présence d'autorité totale (Total Authority Presence)",
  "quality-ledger": "Registre de qualité de la mesure",
};

export function frCapabilityLabel(id: CapabilityId, fallback: string): string {
  return FR_CAPABILITY_LABELS[id] ?? fallback;
}
