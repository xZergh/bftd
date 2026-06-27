import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { RouterLink } from "../tamagui/RouterLink";
import { useQuery } from "urql";
import { PageLoading } from "../components/PageLoading";
import { ProjectWorkspaceHeader } from "../components/ProjectWorkspaceHeader";
import { SplitWorkspace } from "../components/workspace/SplitWorkspace";
import { AutomationAutomatedTable } from "../components/automation/AutomationAutomatedTable";
import { AutomationCoverageTable } from "../components/automation/AutomationCoverageTable";
import { AutomationUiSample } from "../components/automation/AutomationUiSample";
import { AutomatedTestInspector } from "../components/automation/AutomatedTestInspector";
import { ManualAutomationInspector } from "../components/automation/ManualAutomationInspector";
import { EpicsListQuery, TestCasesListQuery, TraceabilityGraphQuery } from "../graphql/documents";
import { formatGraphQlTransportError } from "../graphql/formatGraphQlError";
import type { LinkedAutomatedTest, AutomationWorkspaceTab } from "../automation/automationStatus";
import { parseAutomationTab } from "../automation/automationStatus";
import type { TestCaseListItem } from "../graphql/types";
import { useColumnSort } from "../hooks/useColumnSort";
import { useAutomationInspectorSelection } from "../hooks/useAutomationInspectorSelection";
import { useEpicFilter } from "../hooks/useEpicFilter";
import { writeStoredAutomationAuto, writeStoredAutomationManual } from "../navigation/automationSelection";
import { useShellErrors } from "../shell/ShellErrorsContext";
import { parseGraphNodeId } from "../traceability/graphNodeIds";
import "./ProjectsPage.css";

export function ProjectAutomationPage() {
  const { projectId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab: AutomationWorkspaceTab = parseAutomationTab(searchParams.get("tab"));
  const selectedManualId = searchParams.get("manual");
  const selectedAutoId = searchParams.get("auto");
  const showingSample = searchParams.get("sample") === "1";
  const { epicFilterId, setEpicFilter } = useEpicFilter(projectId ?? "");
  const { setTransportMessage } = useShellErrors();
  const [deferQueries, setDeferQueries] = useState(true);

  const paused = projectId === undefined || projectId === "";

  useEffect(() => {
    if (paused) {
      return;
    }
    setDeferQueries(true);
    queueMicrotask(() => setDeferQueries(false));
  }, [paused, projectId]);

  const queryPaused = paused || deferQueries;

  const [manualResult, reexecuteManual] = useQuery({
    query: TestCasesListQuery,
    variables: { projectId: projectId ?? "", type: "manual", includeDeleted: false },
    pause: queryPaused,
    requestPolicy: "network-only"
  });

  const [automatedResult, reexecuteAutomated] = useQuery({
    query: TestCasesListQuery,
    variables: { projectId: projectId ?? "", type: "automated", includeDeleted: false },
    pause: queryPaused,
    requestPolicy: "network-only"
  });

  const [epicsResult] = useQuery({
    query: EpicsListQuery,
    variables: { projectId: projectId ?? "" },
    pause: queryPaused,
    requestPolicy: "cache-and-network"
  });

  const [graphResult, reexecuteGraph] = useQuery({
    query: TraceabilityGraphQuery,
    variables: { projectId: projectId ?? "" },
    pause: queryPaused,
    requestPolicy: "network-only"
  });

  useEffect(() => {
    if (!manualResult.error && !automatedResult.error && !graphResult.error) {
      return;
    }
    const err = manualResult.error ?? automatedResult.error ?? graphResult.error;
    if (err) {
      setTransportMessage(formatGraphQlTransportError(err));
    }
  }, [automatedResult.error, graphResult.error, manualResult.error, setTransportMessage]);

  const epics = epicsResult.data?.epics ?? [];
  const manualRows: TestCaseListItem[] = manualResult.data?.testCases ?? [];
  const automatedRows: TestCaseListItem[] = automatedResult.data?.testCases ?? [];
  const graph = graphResult.data?.traceabilityGraph;
  const automatedById = useMemo(() => new Map(automatedRows.map((a) => [a.id, a])), [automatedRows]);

  const nodeTitle = useMemo(() => {
    const m = new Map<string, string>();
    for (const n of graph?.nodes ?? []) {
      m.set(n.id, n.title);
    }
    return m;
  }, [graph?.nodes]);

  const linkedAutomatedByManual = useMemo(() => {
    const out = new Map<string, LinkedAutomatedTest[]>();
    if (graph === undefined) {
      return out;
    }
    for (const e of graph.edges) {
      if (e.kind !== "MANUAL_AUTO") {
        continue;
      }
      const manual = parseGraphNodeId(e.sourceId);
      const auto = parseGraphNodeId(e.targetId);
      if (manual?.kind !== "man" || auto?.kind !== "auto") {
        continue;
      }
      const autoTc = automatedById.get(auto.id);
      const entry: LinkedAutomatedTest = {
        id: auto.id,
        title: autoTc?.title ?? nodeTitle.get(e.targetId) ?? auto.id,
        externalKey: autoTc?.externalKey ?? null,
        externalId: autoTc?.externalId ?? null
      };
      const list = out.get(manual.id) ?? [];
      if (!list.some((item) => item.id === entry.id)) {
        list.push(entry);
      }
      out.set(manual.id, list);
    }
    for (const [id, items] of out) {
      out.set(
        id,
        [...items].sort((a, b) => (a.externalKey ?? a.title).localeCompare(b.externalKey ?? b.title))
      );
    }
    return out;
  }, [automatedById, graph, nodeTitle]);

  const linkedManualIdsByAutomated = useMemo(() => {
    const out = new Map<string, string[]>();
    if (graph === undefined) {
      return out;
    }
    for (const e of graph.edges) {
      if (e.kind !== "MANUAL_AUTO") {
        continue;
      }
      const auto = parseGraphNodeId(e.targetId);
      const manual = parseGraphNodeId(e.sourceId);
      if (auto?.kind !== "auto" || manual?.kind !== "man") {
        continue;
      }
      const list = out.get(auto.id) ?? [];
      list.push(manual.id);
      out.set(auto.id, list);
    }
    return out;
  }, [graph]);

  const linkedManualByAutomated = useMemo(() => {
    const out = new Map<string, string[]>();
    if (graph === undefined) {
      return out;
    }
    for (const e of graph.edges) {
      if (e.kind !== "MANUAL_AUTO") {
        continue;
      }
      const auto = parseGraphNodeId(e.targetId);
      if (auto?.kind !== "auto") {
        continue;
      }
      const title = nodeTitle.get(e.sourceId) ?? e.sourceId;
      const list = out.get(auto.id) ?? [];
      list.push(title);
      out.set(auto.id, list);
    }
    return out;
  }, [graph, nodeTitle]);

  const linkedManualCountByAuto = useMemo(() => {
    const out = new Map<string, number>();
    for (const [autoId, titles] of linkedManualByAutomated) {
      out.set(autoId, titles.length);
    }
    return out;
  }, [linkedManualByAutomated]);

  const filteredManual = useMemo(() => {
    if (epicFilterId === "") {
      return manualRows;
    }
    return manualRows.filter((t) => t.epicId === epicFilterId);
  }, [epicFilterId, manualRows]);

  const filteredAutomated = useMemo(() => {
    if (epicFilterId === "") {
      return automatedRows;
    }
    const manualById = new Map(manualRows.map((m) => [m.id, m]));
    return automatedRows.filter((auto) => {
      if (auto.epicId === epicFilterId) {
        return true;
      }
      const linkedManualIds = linkedManualIdsByAutomated.get(auto.id) ?? [];
      return linkedManualIds.some((manualId) => manualById.get(manualId)?.epicId === epicFilterId);
    });
  }, [automatedRows, epicFilterId, linkedManualIdsByAutomated, manualRows]);

  const epicFilterHidesAutomated =
    tab === "automated" &&
    epicFilterId !== "" &&
    automatedRows.length > 0 &&
    filteredAutomated.length === 0;

  const manualSortAccessors = useMemo(
    () => ({
      externalKey: (t: TestCaseListItem) => t.externalKey ?? "",
      title: (t: TestCaseListItem) => t.title,
      automationStatus: (t: TestCaseListItem) => t.automationStatus ?? "not_automated"
    }),
    []
  );
  const manualSort = useColumnSort(filteredManual, manualSortAccessors);

  const autoSortAccessors = useMemo(
    () => ({
      externalKey: (t: TestCaseListItem) => t.externalKey ?? "",
      title: (t: TestCaseListItem) => t.title,
      externalId: (t: TestCaseListItem) => t.externalId ?? "",
      linkedManual: (t: TestCaseListItem) => linkedManualCountByAuto.get(t.id) ?? 0
    }),
    [linkedManualCountByAuto]
  );
  const autoSort = useColumnSort(filteredAutomated, autoSortAccessors, {
    linkedManual: { type: "number", nullValue: 0 }
  });

  const sortedManualIds = useMemo(() => manualSort.sorted.map((t) => t.id), [manualSort.sorted]);
  const sortedAutoIds = useMemo(() => autoSort.sorted.map((t) => t.id), [autoSort.sorted]);

  const clearManual = useCallback(() => {
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev);
        n.delete("manual");
        return n;
      },
      { replace: true }
    );
  }, [setSearchParams]);

  const clearAuto = useCallback(() => {
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev);
        n.delete("auto");
        return n;
      },
      { replace: true }
    );
  }, [setSearchParams]);

  const resetDismissedRef = useRef<() => void>(() => {});

  const selectManual = useCallback(
    (id: string) => {
      resetDismissedRef.current();
      writeStoredAutomationManual(projectId, id);
      setSearchParams(
        (prev) => {
          const n = new URLSearchParams(prev);
          n.set("manual", id);
          n.delete("auto");
          n.delete("sample");
          if (n.get("tab") === "automated") {
            n.delete("tab");
          }
          return n;
        },
        { replace: true }
      );
    },
    [projectId, setSearchParams]
  );

  const selectAuto = useCallback(
    (id: string) => {
      resetDismissedRef.current();
      writeStoredAutomationAuto(projectId, id);
      setSearchParams(
        (prev) => {
          const n = new URLSearchParams(prev);
          n.set("auto", id);
          n.delete("manual");
          n.delete("sample");
          return n;
        },
        { replace: true }
      );
    },
    [projectId, setSearchParams]
  );

  /** Coverage tab: open automated steps in inspector while keeping the manual row selected. */
  const selectAutomatedInspector = useCallback(
    (id: string) => {
      resetDismissedRef.current();
      writeStoredAutomationAuto(projectId, id);
      setSearchParams(
        (prev) => {
          const n = new URLSearchParams(prev);
          n.set("auto", id);
          n.delete("sample");
          return n;
        },
        { replace: true }
      );
    },
    [projectId, setSearchParams]
  );

  const listLoading = manualResult.fetching || automatedResult.fetching || graphResult.fetching;

  const { resetDismissed, dismissInspector } = useAutomationInspectorSelection({
    projectId,
    tab,
    loading: listLoading,
    showingSample,
    sortedManualIds,
    sortedAutoIds,
    selectedManualId,
    selectedAutoId,
    selectManual,
    selectAuto,
    clearManual,
    clearAuto
  });

  resetDismissedRef.current = resetDismissed;

  const setTab = useCallback(
    (next: AutomationWorkspaceTab) => {
      resetDismissedRef.current();
      setSearchParams(
        (prev) => {
          const n = new URLSearchParams(prev);
          if (next === "coverage") {
            n.delete("tab");
          } else {
            n.set("tab", next);
          }
          if (next === "automated") {
            n.delete("manual");
          } else {
            n.delete("auto");
          }
          return n;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const openSamplePanel = useCallback(() => {
    resetDismissedRef.current();
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev);
        n.set("sample", "1");
        n.delete("manual");
        n.delete("auto");
        return n;
      },
      { replace: true }
    );
  }, [setSearchParams]);

  const closeInspector = useCallback(() => {
    dismissInspector();
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev);
        n.delete("manual");
        n.delete("auto");
        n.delete("sample");
        return n;
      },
      { replace: true }
    );
  }, [dismissInspector, setSearchParams]);

  const refreshLists = useCallback(() => {
    reexecuteManual({ requestPolicy: "network-only" });
    reexecuteAutomated({ requestPolicy: "network-only" });
    reexecuteGraph({ requestPolicy: "network-only" });
  }, [reexecuteAutomated, reexecuteGraph, reexecuteManual]);

  const selectedManual = manualRows.find((t) => t.id === selectedManualId);

  if (paused) {
    return null;
  }
  if (deferQueries) {
    return (
      <section className="projects-page" data-testid="automation-page">
        <PageLoading />
      </section>
    );
  }

  const main = (
    <div className="automation-page-main">
      <nav className="automation-subnav" aria-label="Automation views" data-testid="automation-subnav">
        <button
          type="button"
          className={tab === "coverage" ? "automation-subnav-item automation-subnav-item--active" : "automation-subnav-item"}
          aria-current={tab === "coverage" ? "page" : undefined}
          onClick={() => setTab("coverage")}
          data-testid="automation-tab-coverage"
        >
          Coverage
        </button>
        <button
          type="button"
          className={tab === "automated" ? "automation-subnav-item automation-subnav-item--active" : "automation-subnav-item"}
          aria-current={tab === "automated" ? "page" : undefined}
          onClick={() => setTab("automated")}
          data-testid="automation-tab-automated"
        >
          Automated tests
        </button>
      </nav>

      {tab === "coverage" ? (
        <AutomationCoverageTable
          projectId={projectId}
          rows={filteredManual}
          loading={manualResult.fetching}
          selectedManualId={selectedManualId}
          linkedAutomatedByManual={linkedAutomatedByManual}
          sort={manualSort}
          onSelectManual={selectManual}
          onSelectAutomated={selectAutomatedInspector}
        />
      ) : (
        <>
          {epicFilterHidesAutomated ? (
            <p className="projects-toolbar-active-filter" data-testid="automation-epic-filter-empty">
              No automated tests match the epic filter (including via linked manual tests). Try <strong>All epics</strong>.
            </p>
          ) : null}
          <AutomationAutomatedTable
          projectId={projectId}
          rows={filteredAutomated}
          loading={automatedResult.fetching}
          selectedAutoId={selectedAutoId}
          linkedManualCountByAuto={linkedManualCountByAuto}
          sort={autoSort}
          onSelectAutomated={selectAuto}
        />
        </>
      )}
    </div>
  );

  const inspector =
    showingSample ? (
      <AutomationUiSample onClose={closeInspector} />
    ) : selectedAutoId && projectId ? (
      <AutomatedTestInspector
        projectId={projectId}
        testCaseId={selectedAutoId}
        linkedManualTitles={linkedManualByAutomated.get(selectedAutoId) ?? []}
        onClose={closeInspector}
      />
    ) : selectedManual && projectId ? (
      <ManualAutomationInspector
        projectId={projectId}
        testCase={selectedManual}
        linkedAutomated={linkedAutomatedByManual.get(selectedManual.id) ?? []}
        onClose={closeInspector}
        onUpdated={refreshLists}
        onSelectAutomated={selectAutomatedInspector}
      />
    ) : null;

  return (
    <section className="projects-page" data-testid="automation-page">
      <ProjectWorkspaceHeader title="Automation" titleId="automation-heading" projectId={projectId} active="automation" />

      <div className="projects-list-toolbar">
        <label className="projects-toolbar-filter">
          Epic
          <select value={epicFilterId} onChange={(e) => setEpicFilter(e.target.value)} data-testid="automation-epic-filter">
            <option value="">All epics</option>
            {epics.map((epic) => (
              <option key={epic.id} value={epic.id}>
                {epic.externalKey}
              </option>
            ))}
          </select>
        </label>
        {(manualResult.fetching || automatedResult.fetching) && (
          <PageLoading inline dataTestId="automation-list-loading" />
        )}
        <div className="projects-list-toolbar-actions">
          <button type="button" onClick={openSamplePanel} data-testid="automation-open-sample-panel">
            UI sample
          </button>
          <RouterLink to={`/projects/${projectId}/imports`} data-testid="automation-open-imports">
            Import automated tests
          </RouterLink>
        </div>
      </div>

      <SplitWorkspace sectionKey="automation" data-testid="automation-split" main={main} inspector={inspector} />
    </section>
  );
}
