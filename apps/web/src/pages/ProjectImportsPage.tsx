import { useCallback, useState } from "react";
import { useParams } from "react-router-dom";
import { ProjectWorkspaceHeader } from "../components/ProjectWorkspaceHeader";
import { useMutation } from "urql";
import {
  ImportAutomatedFromTrrMutation,
  ImportRequirementDesignLinksMutation,
  ImportRequirementsMutation
} from "../graphql/documents";
import { formatGraphQlTransportError } from "../graphql/formatGraphQlError";
import { useShellErrors } from "../shell/ShellErrorsContext";
import "./ProjectsPage.css";

type ImportTab = "requirements" | "trr" | "design";

type ImportErrorRow = { index: number; code: string; message: string; fixHint: string };
type ImportWarningRow = { index: number; message: string };

function parseJson(text: string): { ok: true; value: unknown } | { ok: false; message: string } {
  const t = text.trim();
  if (t.length === 0) {
    return { ok: false, message: "Paste JSON first." };
  }
  try {
    return { ok: true, value: JSON.parse(t) as unknown };
  } catch {
    return { ok: false, message: "Invalid JSON — check brackets and quotes." };
  }
}

function extractRequirementsPayload(parsed: unknown): { requirements: unknown[] } | { error: string } {
  if (Array.isArray(parsed)) {
    return { requirements: parsed };
  }
  if (parsed !== null && typeof parsed === "object" && "requirements" in parsed) {
    const r = (parsed as { requirements: unknown }).requirements;
    if (Array.isArray(r)) {
      return { requirements: r };
    }
  }
  return { error: "Expected a JSON array of requirement objects, or an object with a \"requirements\" array." };
}

function extractTrrPayload(parsed: unknown): { automatedTests: unknown[] } | { error: string } {
  if (Array.isArray(parsed)) {
    return { automatedTests: parsed };
  }
  if (parsed !== null && typeof parsed === "object" && "automatedTests" in parsed) {
    const a = (parsed as { automatedTests: unknown }).automatedTests;
    if (Array.isArray(a)) {
      return { automatedTests: a };
    }
  }
  return { error: "Expected a JSON array of TRR automated test objects, or an object with an \"automatedTests\" array." };
}

function extractDesignPayload(parsed: unknown): { links: unknown[] } | { error: string } {
  if (Array.isArray(parsed)) {
    return { links: parsed };
  }
  if (parsed !== null && typeof parsed === "object" && "links" in parsed) {
    const l = (parsed as { links: unknown }).links;
    if (Array.isArray(l)) {
      return { links: l };
    }
  }
  return { error: "Expected a JSON array of design link objects, or an object with a \"links\" array." };
}

function ImportErrorsTable({ errors }: { errors: ImportErrorRow[] }) {
  if (errors.length === 0) {
    return null;
  }
  return (
    <div className="import-result-block" data-testid="import-errors-block">
      <h4 className="import-result-subheading">Errors</h4>
      <table className="projects-table import-errors-table">
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Code</th>
            <th scope="col">Message</th>
            <th scope="col">Fix</th>
          </tr>
        </thead>
        <tbody>
          {errors.map((e) => (
            <tr key={`${e.index}-${e.code}`} data-testid="import-error-row" data-import-error-index={e.index}>
              <td data-testid="import-error-index">{e.index}</td>
              <td>
                <code>{e.code}</code>
              </td>
              <td>{e.message}</td>
              <td className="import-error-fix">{e.fixHint}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ImportWarningsTable({ warnings }: { warnings: ImportWarningRow[] }) {
  if (warnings.length === 0) {
    return null;
  }
  return (
    <div className="import-result-block import-warnings-block" data-testid="import-warnings-block">
      <h4 className="import-result-subheading">Warnings</h4>
      <table className="projects-table">
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Message</th>
          </tr>
        </thead>
        <tbody>
          {warnings.map((w, i) => (
            <tr key={`${w.index}-${i}`} data-testid="import-warning-row">
              <td>{w.index}</td>
              <td>{w.message}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ProjectImportsPage() {
  const { projectId } = useParams();
  const { clearShellMessages, setTransportMessage } = useShellErrors();
  const paused = projectId === undefined || projectId === "";

  const [tab, setTab] = useState<ImportTab>("requirements");

  const [reqJson, setReqJson] = useState("");
  const [reqParseError, setReqParseError] = useState<string | null>(null);
  const [reqResult, setReqResult] = useState<{
    createdCount: number;
    updatedCount: number;
    skippedCount: number;
    errors: ImportErrorRow[];
    warnings: ImportWarningRow[];
  } | null>(null);

  const [trrJson, setTrrJson] = useState("");
  const [trrParseError, setTrrParseError] = useState<string | null>(null);
  const [trrResult, setTrrResult] = useState<{
    createdCount: number;
    updatedCount: number;
    skippedCount: number;
    errors: ImportErrorRow[];
  } | null>(null);

  const [designJson, setDesignJson] = useState("");
  const [designProvider, setDesignProvider] = useState("penpot");
  const [designParseError, setDesignParseError] = useState<string | null>(null);
  const [designResult, setDesignResult] = useState<{
    createdCount: number;
    updatedCount: number;
    skippedCount: number;
    errors: ImportErrorRow[];
  } | null>(null);

  const [, importRequirements] = useMutation(ImportRequirementsMutation);
  const [, importTrr] = useMutation(ImportAutomatedFromTrrMutation);
  const [, importDesign] = useMutation(ImportRequirementDesignLinksMutation);

  const onImportRequirements = useCallback(async () => {
    if (paused) {
      return;
    }
    clearShellMessages();
    setReqResult(null);
    const parsed = parseJson(reqJson);
    if (!parsed.ok) {
      setReqParseError(parsed.message);
      return;
    }
    const ext = extractRequirementsPayload(parsed.value);
    if ("error" in ext) {
      setReqParseError(ext.error);
      return;
    }
    setReqParseError(null);
    const res = await importRequirements({
      input: { projectId, requirements: ext.requirements as never[] }
    });
    if (res.error) {
      setTransportMessage(formatGraphQlTransportError(res.error));
      return;
    }
    const d = res.data?.importRequirements;
    if (!d) {
      setTransportMessage("Import returned no data.");
      return;
    }
    setReqResult({
      createdCount: d.createdCount,
      updatedCount: d.updatedCount,
      skippedCount: d.skippedCount,
      errors: d.errors,
      warnings: d.warnings
    });
  }, [clearShellMessages, importRequirements, paused, projectId, reqJson, setTransportMessage]);

  const onImportTrr = useCallback(async () => {
    if (paused) {
      return;
    }
    clearShellMessages();
    setTrrResult(null);
    const parsed = parseJson(trrJson);
    if (!parsed.ok) {
      setTrrParseError(parsed.message);
      return;
    }
    const ext = extractTrrPayload(parsed.value);
    if ("error" in ext) {
      setTrrParseError(ext.error);
      return;
    }
    setTrrParseError(null);
    const res = await importTrr({
      input: { projectId, automatedTests: ext.automatedTests as never[] }
    });
    if (res.error) {
      setTransportMessage(formatGraphQlTransportError(res.error));
      return;
    }
    const d = res.data?.importAutomatedFromTrr;
    if (!d) {
      setTransportMessage("Import returned no data.");
      return;
    }
    setTrrResult({
      createdCount: d.createdCount,
      updatedCount: d.updatedCount,
      skippedCount: d.skippedCount,
      errors: d.errors
    });
  }, [clearShellMessages, importTrr, paused, projectId, setTransportMessage, trrJson]);

  const onImportDesign = useCallback(async () => {
    if (paused) {
      return;
    }
    clearShellMessages();
    setDesignResult(null);
    const parsed = parseJson(designJson);
    if (!parsed.ok) {
      setDesignParseError(parsed.message);
      return;
    }
    const ext = extractDesignPayload(parsed.value);
    if ("error" in ext) {
      setDesignParseError(ext.error);
      return;
    }
    const provider = designProvider.trim();
    if (provider.length === 0) {
      setDesignParseError("Provider is required (e.g. penpot).");
      return;
    }
    setDesignParseError(null);
    const res = await importDesign({
      input: {
        projectId: projectId!,
        provider,
        links: ext.links as never[]
      }
    });
    if (res.error) {
      setTransportMessage(formatGraphQlTransportError(res.error));
      return;
    }
    const d = res.data?.importRequirementDesignLinks;
    if (!d) {
      setTransportMessage("Import returned no data.");
      return;
    }
    setDesignResult({
      createdCount: d.createdCount,
      updatedCount: d.updatedCount,
      skippedCount: d.skippedCount,
      errors: d.errors
    });
  }, [clearShellMessages, designJson, designProvider, importDesign, paused, projectId, setTransportMessage]);

  if (paused) {
    return null;
  }

  return (
    <section className="projects-page" data-testid="imports-page">
      <ProjectWorkspaceHeader
        title="Imports"
        titleId="imports-heading"
        projectId={projectId}
        active="imports"
      />

      <p className="reporting-meta import-intro">
        Paste JSON payloads for bulk operations. Row indexes in errors and warnings refer to positions in the submitted
        array (0-based).
      </p>

      <div className="import-tabs" role="tablist" aria-label="Import type">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "requirements"}
          className={tab === "requirements" ? "import-tab import-tab--active" : "import-tab"}
          onClick={() => setTab("requirements")}
          data-testid="import-tab-requirements"
        >
          Requirements
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "trr"}
          className={tab === "trr" ? "import-tab import-tab--active" : "import-tab"}
          onClick={() => setTab("trr")}
          data-testid="import-tab-trr"
        >
          TRR (automated)
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "design"}
          className={tab === "design" ? "import-tab import-tab--active" : "import-tab"}
          onClick={() => setTab("design")}
          data-testid="import-tab-design"
        >
          Design links
        </button>
      </div>

      {tab === "requirements" ? (
        <div className="import-panel" role="tabpanel" data-testid="import-panel-requirements">
          <p className="import-hint">
            Provide an array of objects with <code>externalKey</code> and <code>title</code> (other fields optional).
            Example: <code>{'[{"externalKey":"REQ-1","title":"Login"}]'}</code>
          </p>
          <textarea
            className="import-json-textarea"
            value={reqJson}
            onChange={(e) => setReqJson(e.target.value)}
            spellCheck={false}
            rows={14}
            data-testid="import-req-json"
            aria-label="Requirements import JSON"
          />
          {reqParseError ? (
            <p className="field-error" role="alert" data-testid="import-req-parse-error">
              {reqParseError}
            </p>
          ) : null}
          <div className="import-actions">
            <button type="button" onClick={onImportRequirements} data-testid="import-req-submit">
              Run import
            </button>
          </div>
          {reqResult ? (
            <div className="import-result" data-testid="import-req-result">
              <dl className="import-counts">
                <div>
                  <dt>Created</dt>
                  <dd data-testid="import-req-result-created">{reqResult.createdCount}</dd>
                </div>
                <div>
                  <dt>Updated</dt>
                  <dd data-testid="import-req-result-updated">{reqResult.updatedCount}</dd>
                </div>
                <div>
                  <dt>Skipped</dt>
                  <dd data-testid="import-req-result-skipped">{reqResult.skippedCount}</dd>
                </div>
              </dl>
              <ImportWarningsTable warnings={reqResult.warnings} />
              <ImportErrorsTable errors={reqResult.errors} />
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === "trr" ? (
        <div className="import-panel" role="tabpanel" data-testid="import-panel-trr">
          <p className="import-hint">
            Each item needs <code>title</code>, <code>externalId</code> or <code>internalTestCaseId</code>, and{" "}
            <code>linkedManualCaseIds</code> (manual testcase ids in this project). Optional <code>steps</code> with{" "}
            <code>order</code> and <code>name</code>.
          </p>
          <textarea
            className="import-json-textarea"
            value={trrJson}
            onChange={(e) => setTrrJson(e.target.value)}
            spellCheck={false}
            rows={14}
            data-testid="import-trr-json"
            aria-label="TRR automated import JSON"
          />
          {trrParseError ? (
            <p className="field-error" role="alert" data-testid="import-trr-parse-error">
              {trrParseError}
            </p>
          ) : null}
          <div className="import-actions">
            <button type="button" onClick={onImportTrr} data-testid="import-trr-submit">
              Run import
            </button>
          </div>
          {trrResult ? (
            <div className="import-result" data-testid="import-trr-result">
              <dl className="import-counts">
                <div>
                  <dt>Created</dt>
                  <dd data-testid="import-trr-result-created">{trrResult.createdCount}</dd>
                </div>
                <div>
                  <dt>Updated</dt>
                  <dd data-testid="import-trr-result-updated">{trrResult.updatedCount}</dd>
                </div>
                <div>
                  <dt>Skipped</dt>
                  <dd data-testid="import-trr-result-skipped">{trrResult.skippedCount}</dd>
                </div>
              </dl>
              <ImportErrorsTable errors={trrResult.errors} />
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === "design" ? (
        <div className="import-panel" role="tabpanel" data-testid="import-panel-design">
          <p className="import-hint">
            Set provider (e.g. <code>penpot</code>), then paste a <code>links</code> array. Each link needs{" "}
            <code>shareUrl</code>; use <code>requirementKey</code> or <code>requirementId</code> to attach.
          </p>
          <label className="import-provider-label">
            Provider{" "}
            <input
              type="text"
              value={designProvider}
              onChange={(e) => setDesignProvider(e.target.value)}
              data-testid="import-design-provider"
            />
          </label>
          <textarea
            className="import-json-textarea"
            value={designJson}
            onChange={(e) => setDesignJson(e.target.value)}
            spellCheck={false}
            rows={14}
            data-testid="import-design-json"
            aria-label="Design links import JSON"
          />
          {designParseError ? (
            <p className="field-error" role="alert" data-testid="import-design-parse-error">
              {designParseError}
            </p>
          ) : null}
          <div className="import-actions">
            <button type="button" onClick={onImportDesign} data-testid="import-design-submit">
              Run import
            </button>
          </div>
          {designResult ? (
            <div className="import-result" data-testid="import-design-result">
              <dl className="import-counts">
                <div>
                  <dt>Created</dt>
                  <dd data-testid="import-design-result-created">{designResult.createdCount}</dd>
                </div>
                <div>
                  <dt>Updated</dt>
                  <dd data-testid="import-design-result-updated">{designResult.updatedCount}</dd>
                </div>
                <div>
                  <dt>Skipped</dt>
                  <dd data-testid="import-design-result-skipped">{designResult.skippedCount}</dd>
                </div>
              </dl>
              <ImportErrorsTable errors={designResult.errors} />
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
