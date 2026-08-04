import { conversionConfig } from "@/lib/conversion/conversion-config";

export const DEMO_SUBMISSION_NOTICE =
  "Demo submission simulated. No information was sent or stored.";

// Mention de soumission simulée, au-dessus de la confirmation gouvernée — laquelle reste identique
// en démo et en production.
//
// L'état vient EXCLUSIVEMENT de `conversionConfig`, jamais de l'URL. `?mode=demo` est une trace de
// navigation, pas une autorité : si le paramètre décidait de la copy, une production réelle
// pourrait afficher « aucune information n'a été transmise » sur simple modification de l'URL —
// exactement le mensonge que toute cette gouvernance existe pour rendre impossible. Inversement,
// une démo ne doit pas pouvoir masquer son disclosure en falsifiant `?mode=live`.
export function DemoSubmissionNotice() {
  if (!conversionConfig.isDemo) return null;
  return (
    <p role="note" data-demo-submission>
      <strong>{DEMO_SUBMISSION_NOTICE}</strong>
    </p>
  );
}

export default DemoSubmissionNotice;
