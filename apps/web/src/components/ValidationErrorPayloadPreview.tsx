import "./ValidationErrorPayloadPreview.css";

/**
 * Shown only after the user submits and client-side mandatory validation fails.
 * Displays the payload built from the form so they can verify values before retrying.
 */
export function ValidationErrorPayloadPreview({ open, payload }: { open: boolean; payload: object }) {
  if (!open) {
    return null;
  }

  return (
    <div className="validation-error-payload-preview" data-testid="validation-error-payload-preview">
      <h4 className="validation-error-payload-heading">Request payload (blocked — fix required fields)</h4>
      <p className="validation-error-payload-hint">
        Submit did not run. This is the client-built payload from your current inputs; correct the fields above and
        try again.
      </p>
      <pre className="validation-error-payload-json" data-testid="validation-error-payload-json">
        {JSON.stringify(payload, null, 2)}
      </pre>
    </div>
  );
}
