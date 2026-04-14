import "./ClientPayloadPreview.css";

/** Read-only JSON the app will send (GraphQL variables / mutation args) so the user can verify before submitting. */
export function ClientPayloadPreview({ payload }: { payload: object }) {
  return (
    <div className="client-payload-preview" data-testid="client-payload-preview">
      <h4 className="client-payload-heading">Client payload (verify)</h4>
      <p className="client-payload-hint">
        Values below are what this form will send to the API. Required fields must be filled before submit runs.
      </p>
      <pre className="client-payload-json" data-testid="client-payload-json">
        {JSON.stringify(payload, null, 2)}
      </pre>
    </div>
  );
}
