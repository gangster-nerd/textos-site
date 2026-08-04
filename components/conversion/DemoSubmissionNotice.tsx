"use client";

import { useSearchParams } from "next/navigation";

export const DEMO_SUBMISSION_NOTICE =
  "Demo submission simulated. No information was sent or stored.";

// Mention de soumission simulée, au-dessus de la confirmation gouvernée — qui reste, elle,
// identique en démo et en production. Le mode est lu dans l'URL (`?mode=demo`), jamais une donnée
// saisie : l'indicateur est non personnel par construction.
export function DemoSubmissionNotice() {
  const isDemo = useSearchParams().get("mode") === "demo";
  if (!isDemo) return null;
  return (
    <p role="note" data-demo-submission>
      <strong>{DEMO_SUBMISSION_NOTICE}</strong>
    </p>
  );
}

export default DemoSubmissionNotice;
