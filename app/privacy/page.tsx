import type { Metadata } from "next";

import { conversionConfig } from "@/lib/conversion/conversion-config";

// Page STATIQUE gouvernée, comme /request-measurement : ce que la page affirme sur le traitement
// des données ne doit pas pouvoir diverger de ce que `conversionConfig` sait réellement.
//
// Deux états honnêtes, jamais un troisième inventé :
//   - mentions légales publiées   → identité du responsable, contact, sous-traitant, durée réelle.
//   - mentions légales absentes   → la page le dit explicitement, plutôt que d'inventer une adresse
//     ou un contact qui n'existe pas encore. Une page de confidentialité vide serait un mensonge
//     par omission ; une page qui admet son propre défaut de configuration ne l'est pas.
export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Privacy",
  description: "How TextOS processes information submitted through this site.",
  robots: { index: false, follow: false },
};

export default function PrivacyPage() {
  const { legalNotice } = conversionConfig;

  return (
    <main>
      <article>
        <h1>Privacy</h1>

        {legalNotice ? (
          <>
            <p>
              <strong>Data controller:</strong> {legalNotice.controllerName}, {legalNotice.controllerAddress}.
            </p>
            <p>
              <strong>Privacy contact:</strong>{" "}
              <a href={`mailto:${legalNotice.privacyContactEmail}`}>
                {legalNotice.privacyContactEmail}
              </a>
              .
            </p>

            <h2>What this notice covers</h2>
            <p>
              This notice describes how information submitted through the{" "}
              <a href="/request-measurement">measurement-request form</a> is processed. It does
              not describe any other flow on this site.
            </p>

            <h2>Data collected</h2>
            <ul>
              <li>A work email address, used only to reply to the request.</li>
              <li>The brand or domain the request concerns.</li>
              <li>The buyer questions submitted to scope the request.</li>
            </ul>

            <h2>Purpose of processing</h2>
            <p>
              This data is used only to review the request and, where the request can be
              considered further, to reply by email. It is not used for any other purpose.
            </p>

            <h2>Processor</h2>
            <p>
              {legalNotice.formProviderName} processes the form submission on behalf of the
              controller. The controller does not send the submission to any other third party.
            </p>

            <h2>Retention</h2>
            <p>Submitted data is retained for {legalNotice.dataRetentionPeriod}.</p>

            <h2>No newsletter enrolment</h2>
            <p>
              Submitting the measurement-request form does not subscribe you to any mailing list.
              This site does not currently operate a newsletter.
            </p>

            <h2>Access and deletion</h2>
            <p>
              To request access to, correction of, or deletion of the data you submitted, email
              the privacy contact above from the same email address used in the submission.
            </p>
          </>
        ) : (
          <>
            <p role="status" data-legal-notice="unpublished">
              This site has not yet published a legal notice for the measurement-request form.
              Until it does, no live submission is accepted — see{" "}
              <a href="/request-measurement">the measurement-request page</a>.
            </p>
            <p>
              This site does not currently operate a newsletter, and no data is collected outside
              the measurement-request form.
            </p>
          </>
        )}
      </article>
    </main>
  );
}
