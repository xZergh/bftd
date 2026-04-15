import { useMemo, type ReactNode } from "react";
import type { TraceabilityGraphPayload } from "../../graphql/types";

type GraphNode = TraceabilityGraphPayload["nodes"][number];
type GraphEdge = TraceabilityGraphPayload["edges"][number];

function sortByTitle(a: GraphNode, b: GraphNode): number {
  return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
}

function TraceTreeNode({ node, children }: { node: GraphNode; children?: ReactNode }) {
  const kindClass =
    node.kind === "REQUIREMENT"
      ? "trace-tree-kind--req"
      : node.kind === "MANUAL"
        ? "trace-tree-kind--man"
        : "trace-tree-kind--auto";

  return (
    <li className="trace-tree-item">
      <div className="trace-tree-row">
        <span className={`trace-tree-kind ${kindClass}`}>{node.kind === "REQUIREMENT" ? "Req" : node.kind === "MANUAL" ? "Man" : "Auto"}</span>
        <span className="trace-tree-title">{node.title}</span>
      </div>
      {children}
    </li>
  );
}

export function TraceabilityTree({ graph }: { graph: TraceabilityGraphPayload }) {
  const { roots, orphanManuals } = useMemo(() => {
    const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
    const reqManual = graph.edges.filter((e: GraphEdge) => e.kind === "REQ_MANUAL");
    const manualAuto = graph.edges.filter((e: GraphEdge) => e.kind === "MANUAL_AUTO");

    const manualWithReq = new Set(reqManual.map((e) => e.targetId));

    const reqNodes = graph.nodes.filter((n) => n.kind === "REQUIREMENT").sort(sortByTitle);

    const roots = reqNodes.map((req) => {
      const manuals = reqManual
        .filter((e) => e.sourceId === req.id)
        .map((e) => nodeById.get(e.targetId))
        .filter((n): n is GraphNode => n !== undefined && n.kind === "MANUAL")
        .sort(sortByTitle);

      const manualChildren = manuals.map((man) => {
        const autos = manualAuto
          .filter((e) => e.sourceId === man.id)
          .map((e) => nodeById.get(e.targetId))
          .filter((n): n is GraphNode => n !== undefined && n.kind === "AUTOMATED")
          .sort(sortByTitle);
        return { man, autos };
      });
      return { req, manualChildren };
    });

    const orphanManuals = graph.nodes
      .filter((n) => n.kind === "MANUAL" && !manualWithReq.has(n.id))
      .sort(sortByTitle)
      .map((man) => {
        const autos = manualAuto
          .filter((e) => e.sourceId === man.id)
          .map((e) => nodeById.get(e.targetId))
          .filter((n): n is GraphNode => n !== undefined && n.kind === "AUTOMATED")
          .sort(sortByTitle);
        return { man, autos };
      });

    return { roots, orphanManuals };
  }, [graph]);

  if (graph.nodes.length === 0) {
    return <p className="reporting-meta">No traceability nodes in this project.</p>;
  }

  return (
    <div className="trace-tree-wrap" data-testid="traceability-tree">
      <ul className="trace-tree trace-tree-root">
        {roots.map(({ req, manualChildren }) => (
          <TraceTreeNode key={req.id} node={req}>
            {manualChildren.length > 0 ? (
              <ul className="trace-tree trace-tree-nested">
                {manualChildren.map(({ man, autos }) => (
                  <TraceTreeNode key={man.id} node={man}>
                    {autos.length > 0 ? (
                      <ul className="trace-tree trace-tree-nested">
                        {autos.map((auto) => (
                          <TraceTreeNode key={auto.id} node={auto} />
                        ))}
                      </ul>
                    ) : null}
                  </TraceTreeNode>
                ))}
              </ul>
            ) : null}
          </TraceTreeNode>
        ))}
      </ul>
      {orphanManuals.length > 0 ? (
        <div className="trace-tree-orphan-block">
          <h4 className="trace-tree-orphan-heading">Manual cases without a requirement link</h4>
          <ul className="trace-tree trace-tree-root">
            {orphanManuals.map(({ man, autos }) => (
              <TraceTreeNode key={man.id} node={man}>
                {autos.length > 0 ? (
                  <ul className="trace-tree trace-tree-nested">
                    {autos.map((auto) => (
                      <TraceTreeNode key={auto.id} node={auto} />
                    ))}
                  </ul>
                ) : null}
              </TraceTreeNode>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
