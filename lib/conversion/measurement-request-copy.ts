// Copy du parcours de conversion — SOURCE FERMÉE, versionnée, validée par Zod au chargement.
//
// Raison d'être : la gouvernance ne peut pas s'arrêter à la copy du CTA. Si le texte du formulaire,
// l'avertissement du champ libre et surtout la page de confirmation vivaient chez le fournisseur,
// ils seraient hors de tout gate — et une confirmation trop enthousiaste y promettrait exactement
// ce que le CTA refuse. Le sous-traitant ne reçoit que la soumission ; il ne possède pas le
// parcours éditorial.
//
// Le contenu Markdown ne peut rien modifier ici : aucun champ de frontmatter ne s'y injecte.

import { z } from "zod";

/** Toute évolution de la copy publique change cette version (traçabilité de l'attribution). */
export const MEASUREMENT_REQUEST_COPY_VERSION = "measurement-request-copy@1";

const NonEmpty = z.string().trim().min(1);

export const MeasurementRequestCopySchema = z
  .object({
    version: z.literal(MEASUREMENT_REQUEST_COPY_VERSION),
    form: z
      .object({
        title: NonEmpty,
        intro: NonEmpty,
        fieldLabel: NonEmpty,
        fieldHelp: NonEmpty,
        emailLabel: NonEmpty,
        emailHelp: NonEmpty,
        brandLabel: NonEmpty,
        brandHelp: NonEmpty,
        warning: NonEmpty,
        submitLabel: NonEmpty,
        errorMessage: NonEmpty,
        unavailableMessage: NonEmpty,
      })
      .strict(),
    confirmation: z.object({ title: NonEmpty, body: NonEmpty }).strict(),
  })
  .strict();

export type MeasurementRequestCopy = z.infer<typeof MeasurementRequestCopySchema>;

const RAW = {
  version: MEASUREMENT_REQUEST_COPY_VERSION,
  form: {
    title: "Request an Authority Presence measurement",
    intro:
      "Provide the context needed to review a potential Authority Presence measurement. Scope and delivery are handled manually while TextOS is in active development.",
    // Champ central : la question acheteur. C'est la matière d'un panel de requêtes.
    fieldLabel: "What questions do your buyers ask?",
    fieldHelp:
      "Share the questions buyers use when comparing brands, products or providers in your market.",
    emailLabel: "Work email",
    emailHelp: "Used only to contact you about this request.",
    brandLabel: "Brand or domain",
    brandHelp: "The brand whose authority presence would be measured.",
    // Avertissement OBLIGATOIRE sur le champ libre : l'origine est publiquement accessible et le
    // formulaire transite par un sous-traitant.
    warning: "Do not include confidential, personal or sensitive information.",
    submitLabel: "Submit measurement request",
    errorMessage: "Your request could not be submitted. Please try again later.",
    // Affiché tant que l'endpoint n'est pas configuré : on ne rend jamais un formulaire qui
    // n'aboutit nulle part.
    unavailableMessage:
      "This form is not accepting submissions yet. No request can be recorded at this time.",
  },
  confirmation: {
    title: "Request received.",
    // Ne promet NI acceptation, NI délai, NI réponse systématique, NI mesure automatique, NI
    // livraison. « will assess whether it can be scoped » et « if the request can be considered
    // further » sont conditionnels à dessein.
    body:
      "Your request has been recorded for review. TextOS will assess whether it can be scoped using the current methodology. This is not an acceptance, a commitment to respond, or delivery of a measurement. If the request can be considered further, we will contact you using the work email provided.",
  },
} satisfies Record<string, unknown>;

/** Copy validée. Une malformation échoue ICI, au chargement — donc au build. */
export const MEASUREMENT_REQUEST_COPY: MeasurementRequestCopy =
  MeasurementRequestCopySchema.parse(RAW);

/**
 * Formulations INTERDITES dans la copy publique de conversion. Une confirmation ne doit jamais
 * promettre ce que le produit refuse : ni acceptation, ni délai, ni automatisme, ni garantie.
 * Vérifié par test — la liste est le contrat, pas une bonne intention.
 */
export const FORBIDDEN_CONVERSION_PHRASES = [
  "automatically",
  "guaranteed",
  "guarantee",
  "we will deliver",
  "within 24",
  "within 48",
  "business days",
  "as soon as possible",
  "we will reply",
  "you will receive",
  "free trial",
  "instant",
] as const;

/** Endpoint du sous-traitant. Absent = formulaire non soumissible, jamais un POST dans le vide. */
export const MEASUREMENT_FORM_ENDPOINT = process.env.MEASUREMENT_FORM_ENDPOINT ?? null;
