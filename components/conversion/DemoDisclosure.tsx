import { conversionConfig } from "@/lib/conversion/conversion-config";

export const DEMO_BANNER =
  "Demo environment — submissions are simulated and are not sent or stored. Use fictional information only.";

// Bandeau de démonstration. Visible en `demo` uniquement : en production, il disparaît et RIEN
// d'autre ne change. C'est la seule différence éditoriale admise entre les deux modes.
export function DemoDisclosure() {
  if (!conversionConfig.isDemo) return null;
  return (
    <p role="note" data-demo-disclosure>
      <strong>{DEMO_BANNER}</strong>
    </p>
  );
}

export default DemoDisclosure;
