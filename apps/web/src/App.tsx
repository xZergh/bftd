import { useState } from "react";
import "./App.css";

export default function App() {
  const [apiMessage, setApiMessage] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  async function checkApi() {
    setApiError(null);
    setApiMessage(null);
    try {
      const res = await fetch("/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "{ projects { id } }" })
      });
      const json = (await res.json()) as {
        data?: unknown;
        errors?: { message: string }[];
      };
      if (!res.ok) {
        setApiError(`HTTP ${res.status}`);
        return;
      }
      if (json.errors?.length) {
        setApiError(json.errors.map((e) => e.message).join("; "));
        return;
      }
      setApiMessage(JSON.stringify(json.data));
    } catch (e) {
      setApiError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="app" data-testid="app-root">
      <header>
        <h1>TCMS</h1>
        <p className="tagline">Local Test Case Management</p>
      </header>
      <main>
        <button type="button" onClick={checkApi} data-testid="check-api">
          Check API
        </button>
        {apiMessage !== null && (
          <pre className="ok" data-testid="api-ok">
            {apiMessage}
          </pre>
        )}
        {apiError !== null && (
          <p className="err" role="alert" data-testid="api-err">
            {apiError}
          </p>
        )}
      </main>
    </div>
  );
}
