"use client";

// MEASUREMENT-REQUEST-CAPTURE-1 — governed Formspree-backed capture form.
//
// Progressive enhancement : the native <form> action + POST works with JS
// disabled (browser navigates to Formspree's hosted confirmation). With JS,
// we intercept, fetch + FormData + Accept: application/json, and render an
// honest inline success/error message. No submitted value is logged, kept in
// state after success, or sent to any URL query. Provider response body is
// never displayed.

import { useCallback, useRef, useState } from "react";

interface Props {
  endpoint: string;
  privacyUrl: string;
  privacyContactEmail: string;
  controllerName: string;
}

type SubmitState = "idle" | "pending" | "success" | "error";

const SUCCESS_COPY =
  "Request received. We\u2019ll review the context and reply by email. No measurement has started yet.";
const ERROR_COPY =
  "We couldn\u2019t confirm receipt of your request. Please try again or contact ";

const MAX_QUESTIONS = 10;
const QUESTION_MAX_LENGTH = 300;

let questionSeq = 0;
const nextQuestionId = () => {
  questionSeq += 1;
  return `mr-question-${questionSeq}`;
};

export function MeasurementRequestCaptureForm({
  endpoint,
  privacyUrl,
  privacyContactEmail,
  controllerName,
}: Props): React.ReactElement {
  const [state, setState] = useState<SubmitState>("idle");
  const [questions, setQuestions] = useState<{ id: string }[]>(() => [
    { id: nextQuestionId() },
  ]);
  const [questionsError, setQuestionsError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const addQuestion = useCallback(() => {
    setQuestions((prev) =>
      prev.length >= MAX_QUESTIONS ? prev : [...prev, { id: nextQuestionId() }],
    );
  }, []);

  const removeQuestion = useCallback((id: string) => {
    setQuestions((prev) => (prev.length <= 1 ? prev : prev.filter((q) => q.id !== id)));
  }, []);

  const onSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      const form = event.currentTarget;
      const values = form
        .querySelectorAll<HTMLInputElement>('input[name="buyer_questions"]');
      const nonEmpty: string[] = [];
      for (const el of Array.from(values)) {
        const trimmed = el.value.trim();
        if (trimmed.length > 0) nonEmpty.push(trimmed);
      }
      if (nonEmpty.length === 0) {
        event.preventDefault();
        setQuestionsError(
          "Add at least one buyer question so we can scope your measurement.",
        );
        const first = values[0];
        if (first) first.focus();
        return;
      }
      setQuestionsError(null);
      // Progressive enhancement: if fetch isn't available, let the browser
      // do a native POST. We only intercept when we can offer a better UX.
      if (typeof fetch !== "function") return;
      event.preventDefault();
      if (state === "pending") return;
      setState("pending");
      const data = new FormData(form);
      // Rewrite buyer_questions entries with trimmed, non-empty values so the
      // provider never receives silent blank rows added by the user.
      data.delete("buyer_questions");
      for (const q of nonEmpty) data.append("buyer_questions", q);
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          body: data,
          headers: { Accept: "application/json" },
        });
        // Never inspect or expose the provider response body.
        if (res.ok) {
          setState("success");
          form.reset();
          setQuestions([{ id: nextQuestionId() }]);
        } else {
          setState("error");
        }
      } catch {
        setState("error");
      }
    },
    [endpoint, state],
  );

  const disabled = state === "pending";
  const canAdd = questions.length < MAX_QUESTIONS && !disabled;
  const canRemove = questions.length > 1 && !disabled;

  return (
    <div className="measurement-request">
      <form
        ref={formRef}
        action={endpoint}
        method="POST"
        onSubmit={onSubmit}
        className="measurement-request__form"
        aria-describedby="measurement-request-privacy"
        data-provider="formspree"
        data-provider-state="configured"
      >
        <div className="measurement-request__field" data-role="measurement-request-field">
          <div className="measurement-request__label-row">
            <label className="measurement-request__label" htmlFor="mr-name">Name</label>
            <span className="measurement-request__optional" aria-hidden="true">Optional</span>
          </div>
          <input
            id="mr-name"
            className="measurement-request__control"
            type="text"
            name="name"
            maxLength={100}
            autoComplete="name"
            disabled={disabled}
          />
        </div>

        <div className="measurement-request__field" data-role="measurement-request-field">
          <div className="measurement-request__label-row">
            <label className="measurement-request__label" htmlFor="mr-email">Work email</label>
            <span className="measurement-request__required" aria-hidden="true">Required</span>
          </div>
          <input
            id="mr-email"
            className="measurement-request__control"
            type="email"
            name="email"
            required
            maxLength={254}
            autoComplete="email"
            aria-required="true"
            disabled={disabled}
          />
        </div>

        <div className="measurement-request__field" data-role="measurement-request-field">
          <div className="measurement-request__label-row">
            <label className="measurement-request__label" htmlFor="mr-company-domain">Company domain</label>
            <span className="measurement-request__required" aria-hidden="true">Required</span>
          </div>
          <input
            id="mr-company-domain"
            className="measurement-request__control"
            type="text"
            name="company_domain"
            required
            maxLength={255}
            autoComplete="organization"
            aria-required="true"
            placeholder="example.com"
            disabled={disabled}
          />
        </div>

        <fieldset
          className="measurement-request__field measurement-request__questions"
          data-role="measurement-request-questions"
        >
          <legend className="measurement-request__legend">
            What questions do your buyers ask?
          </legend>
          <p className="measurement-request__hint">
            Add the real questions buyers ask when evaluating your category, your
            brand or possible alternatives. We use them to scope the query panel
            for your measurement.
          </p>
          <p className="measurement-request__hint">
            Do not include confidential, personal or sensitive information.
          </p>
          <ol className="measurement-request__question-list">
            {questions.map((q, index) => {
              const label = `Buyer question ${index + 1}`;
              return (
                <li key={q.id} className="measurement-request__question-row">
                  <label className="visually-hidden" htmlFor={q.id}>
                    {label}
                  </label>
                  <input
                    id={q.id}
                    className="measurement-request__control"
                    type="text"
                    name="buyer_questions"
                    maxLength={QUESTION_MAX_LENGTH}
                    required={index === 0}
                    aria-required={index === 0 ? "true" : undefined}
                    aria-label={label}
                    disabled={disabled}
                  />
                  {questions.length > 1 ? (
                    <button
                      type="button"
                      className="measurement-request__question-remove"
                      onClick={() => removeQuestion(q.id)}
                      disabled={!canRemove}
                      aria-label={`Remove ${label}`}
                    >
                      Remove
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ol>
          <div className="measurement-request__question-actions">
            <button
              type="button"
              className="measurement-request__question-add"
              onClick={addQuestion}
              disabled={!canAdd}
            >
              Add another question
            </button>
            <span className="measurement-request__question-count" aria-hidden="true">
              {questions.length} / {MAX_QUESTIONS}
            </span>
          </div>
          {questionsError ? (
            <p
              className="measurement-request__question-error"
              role="alert"
              data-role="measurement-request-questions-error"
            >
              {questionsError}
            </p>
          ) : null}
        </fieldset>

        <div className="measurement-request__field" data-role="measurement-request-field">
          <div className="measurement-request__label-row">
            <label className="measurement-request__label" htmlFor="mr-context">Measurement context</label>
            <span className="measurement-request__optional" aria-hidden="true">Optional</span>
          </div>
          <textarea
            id="mr-context"
            className="measurement-request__control measurement-request__control--textarea"
            name="measurement_context"
            maxLength={2000}
            rows={5}
            disabled={disabled}
          />
          <span className="measurement-request__hint">
            Do not include confidential, personal or sensitive information.
          </span>
        </div>

        <p className="measurement-request__note">
          Requests are reviewed manually. No measurement starts on submission.
        </p>

        <div className="measurement-request__actions">
          <button
            type="submit"
            className="cse-surface__cta-primary measurement-request__submit"
            disabled={disabled}
            data-role="measurement-request-submit"
            data-cse-instrument-event="measurement_request_submit_attempt"
          >
            {disabled ? "Sending\u2026" : "Send measurement request"}
          </button>
        </div>

        <div
          className="measurement-request__status"
          role="status"
          aria-live="polite"
          data-role="measurement-request-status"
          data-state={state}
        >
          {state === "success" ? <span>{SUCCESS_COPY}</span> : null}
          {state === "error" ? (
            <span>
              {ERROR_COPY}
              <a href={`mailto:${privacyContactEmail}`}>{privacyContactEmail}</a>.
            </span>
          ) : null}
        </div>
      </form>

      <aside
        id="measurement-request-privacy"
        className="measurement-request__privacy"
        data-role="measurement-request-privacy"
      >
        <p>
          <strong>Data controller:</strong> {controllerName}. <strong>Purpose:</strong>{" "}
          review and respond to the requested Authority Presence measurement.
        </p>
        <p>
          The submission does not subscribe you to marketing or the newsletter.
          Formspree processes the form submission on behalf of the controller.
        </p>
        <p>
          Privacy contact:{" "}
          <a href={`mailto:${privacyContactEmail}`}>{privacyContactEmail}</a>. See the{" "}
          <a href={privacyUrl}>privacy notice</a> for details.
        </p>
      </aside>
    </div>
  );
}
