import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery } from "urql";
import { PageLoading } from "../components/PageLoading";
import { ProjectWorkspaceHeader } from "../components/ProjectWorkspaceHeader";
import {
  RequirementDesignLinksQuery,
  RequirementsListQuery,
  UnlinkRequirementDesignLinkMutation,
  UpsertRequirementDesignLinkMutation
} from "../graphql/documents";
import { formatGraphQlTransportError } from "../graphql/formatGraphQlError";
import { REQUIRED_MSG, trimmedNonEmpty } from "../forms/mandatoryFields";
import type { RequirementListItem } from "../graphql/types";
import { useShellErrors } from "../shell/ShellErrorsContext";
import "./ProjectsPage.css";

type DesignLinkRow = {
  id: string;
  projectId: string;
  requirementId: string;
  provider: string;
  designProjectId: string | null;
  designFileId: string | null;
  designPageId: string | null;
  designNodeId: string | null;
  shareUrl: string;
  title: string | null;
  lastSyncedAt: string | null;
};

function nonEmpty(s: string): string | undefined {
  const t = s.trim();
  return t.length > 0 ? t : undefined;
}

export function ProjectDesignLinksPage() {
  const { projectId } = useParams();
  const { clearShellMessages, setTransportMessage, setPayloadAppError } = useShellErrors();
  const paused = projectId === undefined || projectId === "";

  const [filterRequirementId, setFilterRequirementId] = useState("");

  const [reqListResult] = useQuery({
    query: RequirementsListQuery,
    variables: { projectId: projectId ?? "" },
    pause: paused,
    requestPolicy: "network-only"
  });

  const [linksResult, reexecuteLinks] = useQuery({
    query: RequirementDesignLinksQuery,
    variables: {
      projectId: projectId ?? "",
      requirementId: filterRequirementId === "" ? undefined : filterRequirementId
    },
    pause: paused,
    requestPolicy: "network-only"
  });

  const [, upsertLink] = useMutation(UpsertRequirementDesignLinkMutation);
  const [, unlinkLink] = useMutation(UnlinkRequirementDesignLinkMutation);

  const [upsertRequirementId, setUpsertRequirementId] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [title, setTitle] = useState("");
  const [designProjectId, setDesignProjectId] = useState("");
  const [designFileId, setDesignFileId] = useState("");
  const [designPageId, setDesignPageId] = useState("");
  const [designNodeId, setDesignNodeId] = useState("");
  const [shareUrlError, setShareUrlError] = useState<string | null>(null);
  const [reqError, setReqError] = useState<string | null>(null);

  useEffect(() => {
    if (!reqListResult.error) {
      return;
    }
    setTransportMessage(formatGraphQlTransportError(reqListResult.error));
  }, [reqListResult.error, setTransportMessage]);

  useEffect(() => {
    if (!linksResult.error) {
      return;
    }
    setTransportMessage(formatGraphQlTransportError(linksResult.error));
  }, [linksResult.error, setTransportMessage]);

  const reqLabelById = useMemo(() => {
    const list: RequirementListItem[] = reqListResult.data?.requirements ?? [];
    const m = new Map<string, string>();
    for (const r of list) {
      m.set(r.id, `${r.externalKey}: ${r.title}`);
    }
    return m;
  }, [reqListResult.data?.requirements]);

  const requirements: RequirementListItem[] = reqListResult.data?.requirements ?? [];

  const links: DesignLinkRow[] = (linksResult.data?.requirementDesignLinks ?? []) as DesignLinkRow[];

  const onUpsert = useCallback(async () => {
    if (paused) {
      return;
    }
    clearShellMessages();
    setShareUrlError(null);
    setReqError(null);
    if (!trimmedNonEmpty(upsertRequirementId)) {
      setReqError(REQUIRED_MSG);
      return;
    }
    if (!trimmedNonEmpty(shareUrl.trim())) {
      setShareUrlError(REQUIRED_MSG);
      return;
    }
    const res = await upsertLink({
      input: {
        projectId: projectId!,
        requirementId: upsertRequirementId,
        provider: "penpot",
        shareUrl: shareUrl.trim(),
        title: nonEmpty(title),
        designProjectId: nonEmpty(designProjectId),
        designFileId: nonEmpty(designFileId),
        designPageId: nonEmpty(designPageId),
        designNodeId: nonEmpty(designNodeId)
      }
    });
    if (res.error) {
      setTransportMessage(formatGraphQlTransportError(res.error));
      return;
    }
    const appErr = res.data?.upsertRequirementDesignLink?.error;
    if (appErr) {
      setPayloadAppError(appErr);
      return;
    }
    setTitle("");
    reexecuteLinks({ requestPolicy: "network-only" });
  }, [
    clearShellMessages,
    designFileId,
    designNodeId,
    designPageId,
    designProjectId,
    paused,
    projectId,
    reexecuteLinks,
    setPayloadAppError,
    setTransportMessage,
    shareUrl,
    title,
    upsertLink,
    upsertRequirementId
  ]);

  const onUnlink = useCallback(
    async (row: DesignLinkRow) => {
      if (paused) {
        return;
      }
      clearShellMessages();
      const res = await unlinkLink({
        input: {
          projectId: projectId!,
          requirementId: row.requirementId,
          provider: row.provider,
          shareUrl: row.shareUrl
        }
      });
      if (res.error) {
        setTransportMessage(formatGraphQlTransportError(res.error));
        return;
      }
      reexecuteLinks({ requestPolicy: "network-only" });
    },
    [clearShellMessages, paused, projectId, reexecuteLinks, setTransportMessage, unlinkLink]
  );

  if (paused) {
    return null;
  }

  return (
    <section className="projects-page" data-testid="design-links-page">
      <ProjectWorkspaceHeader
        title="Design links"
        titleId="design-links-heading"
        projectId={projectId}
        active="design-links"
      />

      <p className="reporting-meta">
        MVP supports provider <strong>penpot</strong> only. Links are keyed by project, requirement, provider, and share URL.
      </p>

      <div className="projects-create design-links-filter">
        <h3 className="projects-subheading">Filter list</h3>
        <label>
          Requirement
          <select
            value={filterRequirementId}
            onChange={(e) => setFilterRequirementId(e.target.value)}
            data-testid="design-link-filter-requirement"
          >
            <option value="">All requirements</option>
            {requirements.map((r) => (
              <option key={r.id} value={r.id}>
                {r.externalKey}: {r.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="projects-create" data-testid="design-link-upsert-panel">
        <h3 className="projects-subheading">Upsert Penpot link</h3>
        <div className="projects-create-fields design-links-form-grid">
          <label>
            Requirement <span className="required-star" aria-hidden="true">*</span>
            <select
              value={upsertRequirementId}
              onChange={(e) => {
                setUpsertRequirementId(e.target.value);
                setReqError(null);
              }}
              data-testid="design-link-requirement"
            >
              <option value="">Select…</option>
              {requirements.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.externalKey}: {r.title}
                </option>
              ))}
            </select>
            {reqError !== null ? (
              <p className="field-error" role="alert" data-testid="design-link-requirement-error">
                {reqError}
              </p>
            ) : null}
          </label>
          <label>
            Share URL <span className="required-star" aria-hidden="true">*</span>
            <input
              type="text"
              value={shareUrl}
              onChange={(e) => {
                setShareUrl(e.target.value);
                setShareUrlError(null);
              }}
              data-testid="design-link-share-url"
              autoComplete="off"
            />
            {shareUrlError !== null ? (
              <p className="field-error" role="alert" data-testid="design-link-share-url-error">
                {shareUrlError}
              </p>
            ) : null}
          </label>
          <label>
            Title
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              data-testid="design-link-title"
              autoComplete="off"
            />
          </label>
          <label>
            Design project id
            <input
              type="text"
              value={designProjectId}
              onChange={(e) => setDesignProjectId(e.target.value)}
              data-testid="design-link-project-id"
              autoComplete="off"
            />
          </label>
          <label>
            Design file id
            <input
              type="text"
              value={designFileId}
              onChange={(e) => setDesignFileId(e.target.value)}
              data-testid="design-link-file-id"
              autoComplete="off"
            />
          </label>
          <label>
            Design page id
            <input
              type="text"
              value={designPageId}
              onChange={(e) => setDesignPageId(e.target.value)}
              data-testid="design-link-page-id"
              autoComplete="off"
            />
          </label>
          <label>
            Design node id
            <input
              type="text"
              value={designNodeId}
              onChange={(e) => setDesignNodeId(e.target.value)}
              data-testid="design-link-node-id"
              autoComplete="off"
            />
          </label>
        </div>
        <button type="button" onClick={onUpsert} data-testid="design-link-submit">
          Save link
        </button>
      </div>

      {linksResult.fetching ? <PageLoading dataTestId="design-links-loading" /> : null}

      <table className="projects-table" data-testid="design-links-table">
        <thead>
          <tr>
            <th scope="col">Requirement</th>
            <th scope="col">Provider</th>
            <th scope="col">Share URL</th>
            <th scope="col">Title</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {links.map((row) => (
            <tr key={row.id} data-testid="design-link-row" data-design-link-id={row.id}>
              <td>{reqLabelById.get(row.requirementId) ?? row.requirementId}</td>
              <td>
                <code>{row.provider}</code>
              </td>
              <td>
                <a href={row.shareUrl} target="_blank" rel="noreferrer">
                  {row.shareUrl}
                </a>
              </td>
              <td data-testid="design-link-row-title">{row.title ?? "—"}</td>
              <td>
                <button
                  type="button"
                  onClick={() => void onUnlink(row)}
                  data-testid="design-link-unlink"
                >
                  Unlink
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!linksResult.fetching && links.length === 0 ? (
        <p className="projects-empty" data-testid="design-links-empty">
          No design links for this filter.
        </p>
      ) : null}
    </section>
  );
}
