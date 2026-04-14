import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery } from "urql";
import { ClientPayloadPreview } from "../components/ClientPayloadPreview";
import {
  CreateRequirementMutation,
  RequirementsListQuery
} from "../graphql/documents";
import { formatGraphQlTransportError } from "../graphql/formatGraphQlError";
import { REQUIRED_MSG, trimmedNonEmpty } from "../forms/mandatoryFields";
import type { RequirementListItem } from "../graphql/types";
import { useShellErrors } from "../shell/ShellErrorsContext";
import "./ProjectsPage.css";

export function RequirementsListPage() {
  const { projectId } = useParams();
  const { clearShellMessages, setTransportMessage, setPayloadAppError } = useShellErrors();
  const [externalKey, setExternalKey] = useState("");
  const [title, setTitle] = useState("");
  const [externalKeyError, setExternalKeyError] = useState<string | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);

  const [listResult, reexecuteList] = useQuery({
    query: RequirementsListQuery,
    variables: { projectId: projectId ?? "" },
    pause: projectId === undefined || projectId === "",
    requestPolicy: "network-only"
  });

  const [, createRequirement] = useMutation(CreateRequirementMutation);

  useEffect(() => {
    if (!listResult.error) {
      return;
    }
    const err = listResult.error;
    queueMicrotask(() => {
      setTransportMessage(formatGraphQlTransportError(err));
    });
  }, [listResult.error, setTransportMessage]);

  const createRequirementClientPayload = useMemo(() => {
    const key = externalKey.trim();
    const t = title.trim();
    return {
      mutation: "CreateRequirement",
      variables: {
        input: {
          projectId: projectId ?? null,
          externalKey: key.length > 0 ? key : null,
          title: t.length > 0 ? t : null
        }
      }
    };
  }, [externalKey, projectId, title]);

  const onCreate = useCallback(async () => {
    if (projectId === undefined || projectId === "") {
      return;
    }
    clearShellMessages();
    const key = externalKey.trim();
    const t = title.trim();
    let invalid = false;
    if (!trimmedNonEmpty(key)) {
      setExternalKeyError(REQUIRED_MSG);
      invalid = true;
    } else {
      setExternalKeyError(null);
    }
    if (!trimmedNonEmpty(t)) {
      setTitleError(REQUIRED_MSG);
      invalid = true;
    } else {
      setTitleError(null);
    }
    if (invalid) {
      return;
    }
    const res = await createRequirement({
      input: {
        projectId,
        externalKey: key,
        title: t
      }
    });
    if (res.error) {
      setTransportMessage(formatGraphQlTransportError(res.error));
      return;
    }
    const appErr = res.data?.createRequirement?.error;
    if (appErr) {
      setPayloadAppError(appErr);
      return;
    }
    setExternalKey("");
    setTitle("");
    reexecuteList({ requestPolicy: "network-only" });
  }, [
    clearShellMessages,
    createRequirement,
    externalKey,
    projectId,
    reexecuteList,
    setPayloadAppError,
    setTransportMessage,
    title
  ]);

  if (projectId === undefined || projectId === "") {
    return null;
  }

  const rows: RequirementListItem[] = listResult.data?.requirements ?? [];

  return (
    <section className="projects-page" data-testid="requirements-page">
      <div className="project-detail-header">
        <h2 id="requirements-heading">Requirements</h2>
        <Link to={`/projects/${projectId}`} data-testid="requirements-back-project">
          ← Project
        </Link>
      </div>

      <div className="projects-create" data-testid="requirement-create-panel">
        <h3 className="projects-subheading">New requirement</h3>
        <div className="projects-create-fields">
          <label>
            External key <span className="required-star" aria-hidden="true">*</span>
            <input
              type="text"
              value={externalKey}
              onChange={(e) => {
                setExternalKey(e.target.value);
                setExternalKeyError(null);
              }}
              data-testid="requirement-create-key"
              autoComplete="off"
              required
              aria-invalid={externalKeyError !== null}
              aria-describedby={externalKeyError !== null ? "requirement-create-key-err" : undefined}
            />
            {externalKeyError !== null && (
              <p
                id="requirement-create-key-err"
                className="field-error"
                role="alert"
                data-testid="requirement-create-key-error"
              >
                {externalKeyError}
              </p>
            )}
          </label>
          <label>
            Title <span className="required-star" aria-hidden="true">*</span>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setTitleError(null);
              }}
              data-testid="requirement-create-title"
              autoComplete="off"
              required
              aria-invalid={titleError !== null}
              aria-describedby={titleError !== null ? "requirement-create-title-err" : undefined}
            />
            {titleError !== null && (
              <p
                id="requirement-create-title-err"
                className="field-error"
                role="alert"
                data-testid="requirement-create-title-error"
              >
                {titleError}
              </p>
            )}
          </label>
        </div>
        <ClientPayloadPreview payload={createRequirementClientPayload} />
        <button type="button" onClick={onCreate} data-testid="requirement-create-submit">
          Create
        </button>
      </div>

      {listResult.fetching && (
        <p className="projects-loading" data-testid="requirements-list-loading">
          Loading…
        </p>
      )}

      {rows.length === 0 && !listResult.fetching ? (
        <p className="projects-empty" data-testid="requirements-list-empty">
          No requirements yet.
        </p>
      ) : (
        <table className="projects-table">
          <thead>
            <tr>
              <th scope="col">Key</th>
              <th scope="col">Title</th>
              <th scope="col"> </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} data-requirement-key={r.externalKey} data-testid="requirement-row">
                <td>
                  <code>{r.externalKey}</code>
                </td>
                <td>{r.title}</td>
                <td>
                  <Link
                    to={`/projects/${projectId}/requirements/${r.id}`}
                    data-testid="requirement-open"
                  >
                    Open
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
