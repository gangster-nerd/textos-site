# CPO decision — newsletter in the product PLG, one measurement-request form

- **Decision date**: 2026-10-27
- **Owner**: CPO
- **Scope**: textos-site conversion and retention surfaces (port of PR #22, CMO V2 article surface)
- **Reference id**: `CPO-2026-10-27-newsletter-plg-and-single-request-form`

## 1. Newsletter: managed in the TextOS product PLG

The newsletter is a product capability, managed by the TextOS PLG layer, not a provider embedded in
this site. The product's PLG Lifecycle Email V1 contract defers "newsletter / marketing consent" and
requires every such extension to "consume this outbox/event truth rather than bypass it".

Consequences for this site:

- no newsletter provider is wired here and the site collects no email address;
- like the product entry (ENTRY-1), the site owns only the call to subscribe and a hand-off link;
  the product owns identity, marketing consent (double opt-in, unsubscribe) and sending;
- until the product exposes that subscription route, `newsletterConfig.handoffUrl` is `null`: the
  newsletter box cannot submit, is shown disabled in preview builds only, and `/privacy` keeps
  stating that the site operates no newsletter.

## 2. One measurement-request form

The duplicate capture form brought by PR #22 (`MeasurementRequestCaptureForm`, provider-specific,
no longer wired after the port) is removed. The single form is `MeasurementRequestForm` on
`/request-measurement`, delivered through `CONVERSION_MODE` (off / demo / live) and the deployment's
`MEASUREMENT_FORM_ENDPOINT`. Longer term, the product entry (ENTRY-1, `/auth/start`) replaces it once
self-serve is published in the product manifest.
