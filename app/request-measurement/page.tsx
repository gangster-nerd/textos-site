import type { Metadata } from "next";

import { MeasurementRequestCaptureForm } from "@/components/conversion/MeasurementRequestCaptureForm";
import { measurementRequestCapability } from "@/lib/config/measurement-request-config";

// MEASUREMENT-REQUEST-CAPTURE-1 — governed capture surface.
// Static-export compatible : the page shell is server-rendered, the form is a
// client component that progressively enhances the native POST. If the
// governed capability is unconfigured (invalid endpoint), the page fails
// closed with a non-submittable notice — no dead-linked commercial CTA.
export const dynamic = "force-static";

const TITLE = "Request an Authority Presence measurement";
const INTRO =
  "Provide the context needed to review a potential Authority Presence measurement. Requests are reviewed manually. No measurement starts on submission.";

export const metadata: Metadata = {
  title: TITLE,
  description: INTRO,
  robots: { index: false, follow: false },
};

export default function RequestMeasurementPage() {
  const cap = measurementRequestCapability;
  return (
    <main>
      <article>
        <h1>{TITLE}</h1>
        <p>{INTRO}</p>
        {cap.state === "configured" ? (
          <MeasurementRequestCaptureForm
            endpoint={cap.endpoint}
            privacyUrl={cap.privacyUrl}
            privacyContactEmail={cap.privacyContactEmail}
            controllerName={cap.controllerName}
          />
        ) : (
          <p
            role="status"
            data-role="measurement-request-status"
            data-state="unavailable"
            data-provider-state="unconfigured"
          >
            The measurement-request capture is temporarily unavailable. Please
            contact {cap.controllerName} at {cap.privacyContactEmail}.
          </p>
        )}
      </article>
    </main>
  );
}
