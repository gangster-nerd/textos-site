import type { Metadata } from "next";

import { measurementRequestCapability } from "@/lib/config/measurement-request-config";

export const dynamic = "force-static";

const REVISION_DATE = "2026-09-18";

export const metadata: Metadata = {
  title: "Privacy notice",
  description:
    "How TextOS processes information submitted through the measurement-request form.",
  robots: { index: false, follow: false },
};

export default function PrivacyPage() {
  const cap = measurementRequestCapability;
  return (
    <main>
      <article>
        <h1>Privacy notice</h1>
        <p>
          <strong>Data controller:</strong> {cap.controllerName}.{" "}
          <strong>Privacy contact:</strong>{" "}
          <a href={`mailto:${cap.privacyContactEmail}`}>{cap.privacyContactEmail}</a>.
        </p>

        <h2>What this notice covers</h2>
        <p>
          This notice describes how information submitted through the{" "}
          <a href="/request-measurement">measurement-request form</a> is
          processed. It does not describe any other flow on this site.
        </p>

        <h2>Data collected by the measurement-request form</h2>
        <ul>
          <li>An optional name.</li>
          <li>A work email address (required to reply).</li>
          <li>A company domain (required to scope the request).</li>
          <li>
            One or more buyer questions (required, up to ten) used to scope the
            query panel for the requested measurement.
          </li>
          <li>An optional free-text measurement context.</li>
        </ul>

        <h2>Purpose of processing</h2>
        <p>
          The data submitted through the form is used to review the request,
          assess whether an Authority Presence measurement can be scoped, and
          reply by email. It is not used for any other purpose.
        </p>

        <h2>Processor</h2>
        <p>
          Formspree processes the form submission on behalf of the controller.
          The controller does not send the submission to any other third party
          from this form.
        </p>

        <h2>No automatic newsletter enrolment</h2>
        <p>
          Submitting the measurement-request form does not subscribe you to
          the TextOS newsletter or any marketing communication. The newsletter,
          when available, has its own separate opt-in.
        </p>

        <h2>Access and deletion</h2>
        <p>
          To request access to, correction of, or deletion of the data you
          submitted through the measurement-request form, email the privacy
          contact at{" "}
          <a href={`mailto:${cap.privacyContactEmail}`}>{cap.privacyContactEmail}</a>{" "}
          from the same email address used in the submission.
        </p>

        <p>
          <em>Page revision:</em>{" "}
          <time dateTime={REVISION_DATE}>{REVISION_DATE}</time>.
        </p>
      </article>
    </main>
  );
}
