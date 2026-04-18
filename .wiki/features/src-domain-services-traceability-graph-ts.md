---

## title: "Traceability Graph Service"
type: "feature"
status: "active"
source_paths: ["src/domain/services/traceability-graph.ts"]
updated_at: "2026-04-17"

Traceability graph service returns a project-scoped graph of requirement/manual/automated nodes and edges.

## Output model

- Nodes are typed as `REQUIREMENT`, `MANUAL`, or `AUTOMATED`.
- Edges are typed as `REQ_MANUAL` and `MANUAL_AUTO`.
- Includes `coverageByRequirementStatus` summary buckets.

## Scope controls

- Requires valid project ID.
- Excludes deleted testcases from graph nodes and active edge projection.

## Related pages

- `[[features-src-domain-services-traceability-ts]]`
- `[[features-src-domain-services-runs-ts]]`