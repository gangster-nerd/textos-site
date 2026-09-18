// CMO-CONVERSION-SURFACE-2 — newsletter retention adapter config.
//
// Replaceable NewsletterAdapter. The current governed provider is Buttondown
// but the shape is provider-agnostic (only `provider` is used to select the
// action URL). No credential ever lives here — the provider decides the flow
// via its embed endpoint.

export type NewsletterProvider = "buttondown";

export interface NewsletterConfig {
  provider: NewsletterProvider;
  /** Provider account handle. `null` → unconfigured, form must not submit. */
  username: string | null;
  /** Tag surfaced through governed hidden inputs. */
  sourceTag: string;
  /** Surface version this adapter is bound to (for governance / analytics). */
  surfaceVersion: string;
  /** Governed privacy notice URL. `null` → activation blocked. */
  privacyUrl: string | null;
}

const RAW_USERNAME = (process.env.BUTTONDOWN_USERNAME ?? "").trim();
const IS_UNCONFIGURED =
  RAW_USERNAME === "" || RAW_USERNAME.toUpperCase() === "UNCONFIGURED";
const RAW_PRIVACY = (process.env.TEXTOS_PRIVACY_URL ?? "").trim();

export const newsletterConfig: NewsletterConfig = {
  provider: "buttondown",
  username: IS_UNCONFIGURED ? null : RAW_USERNAME,
  sourceTag: "textos-insights",
  surfaceVersion: "reference@3",
  privacyUrl: RAW_PRIVACY === "" ? null : RAW_PRIVACY,
};

export function newsletterProviderState(cfg: NewsletterConfig): "configured" | "unconfigured" {
  return cfg.username && cfg.privacyUrl ? "configured" : "unconfigured";
}

export function buttondownActionUrl(username: string): string {
  return `https://buttondown.com/api/emails/embed-subscribe/${encodeURIComponent(username)}`;
}
