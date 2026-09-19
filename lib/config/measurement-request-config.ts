// MEASUREMENT-REQUEST-CAPTURE-1 — governed capability for the public
// measurement-request capture surface.
//
// Public, non-secret configuration. The Formspree endpoint id is public by
// design (Formspree forms are addressed by a shareable id, not a credential),
// so the values live here — not in .env, not in a secret store. If the
// endpoint fails validation, the capability resolves fail-closed as
// `unconfigured` so the commercial CTA never links to a non-submittable page.

export type MeasurementRequestProvider = "formspree";
export type MeasurementRequestState = "configured" | "unconfigured";

export interface MeasurementRequestCapability {
  provider: MeasurementRequestProvider;
  endpoint: string;
  state: MeasurementRequestState;
  controllerName: string;
  privacyContactEmail: string;
  privacyUrl: string;
}

const RAW_ENDPOINT = "https://formspree.io/f/meaoonqy";
const CONTROLLER_NAME = "Marc Prp - TextOS";
const PRIVACY_CONTACT_EMAIL = "marcprp@gmail.com";
const PRIVACY_URL = "/privacy";

export function isValidFormspreeEndpoint(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return false;
    if (url.hostname !== "formspree.io") return false;
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length !== 2) return false;
    if (parts[0] !== "f") return false;
    if (parts[1].length === 0) return false;
    return true;
  } catch {
    return false;
  }
}

export function resolveMeasurementRequestCapability(
  raw: string = RAW_ENDPOINT,
): MeasurementRequestCapability {
  const configured = isValidFormspreeEndpoint(raw);
  return {
    provider: "formspree",
    endpoint: configured ? raw : "",
    state: configured ? "configured" : "unconfigured",
    controllerName: CONTROLLER_NAME,
    privacyContactEmail: PRIVACY_CONTACT_EMAIL,
    privacyUrl: PRIVACY_URL,
  };
}

export const measurementRequestCapability: MeasurementRequestCapability =
  resolveMeasurementRequestCapability();
