export type ReadableAllureStep = {
  id: string;
  stepOrder: number;
  name: string;
  expectedResult?: string | null;
  parentStepId?: string | null;
  sourceStepId?: string | null;
  metaJson?: string | null;
};

type StepKind = "step" | "assert" | "attachment";

function parseStepKind(metaJson: string | null | undefined): StepKind {
  if (metaJson === null || metaJson === undefined || metaJson.trim() === "") {
    return "step";
  }
  try {
    const meta = JSON.parse(metaJson) as Record<string, unknown>;
    const kind = meta.kind ?? meta.type ?? meta.stepType;
    if (kind === "assert" || kind === "assertion") {
      return "assert";
    }
    if (kind === "attachment") {
      return "attachment";
    }
  } catch {
    return "step";
  }
  return "step";
}

type TreeNode = ReadableAllureStep & { depth: number; kind: StepKind; children: TreeNode[] };

function buildStepTree(steps: ReadableAllureStep[]): TreeNode[] {
  const ordered = [...steps].sort((a, b) => a.stepOrder - b.stepOrder);
  const bySource = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  for (const step of ordered) {
    const node: TreeNode = {
      ...step,
      depth: 0,
      kind: parseStepKind(step.metaJson),
      children: []
    };
    if (step.sourceStepId) {
      bySource.set(step.sourceStepId, node);
    }
    bySource.set(step.id, node);

    const parentKey = step.parentStepId;
    const parent = parentKey ? bySource.get(parentKey) : undefined;
    if (parent) {
      node.depth = parent.depth + 1;
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

function flattenTree(nodes: TreeNode[]): TreeNode[] {
  const out: TreeNode[] = [];
  const walk = (list: TreeNode[]) => {
    for (const node of list) {
      out.push(node);
      if (node.children.length > 0) {
        walk(node.children);
      }
    }
  };
  walk(nodes);
  return out;
}

function kindLabel(kind: StepKind): string | null {
  if (kind === "assert") {
    return "Assert";
  }
  if (kind === "attachment") {
    return "Attachment";
  }
  return null;
}

type Props = {
  steps: ReadableAllureStep[];
  emptyMessage?: string;
};

export function AllureStepsReadable({ steps, emptyMessage = "No automated steps recorded yet." }: Props) {
  if (steps.length === 0) {
    return (
      <p className="automation-steps-empty" data-testid="allure-steps-empty">
        {emptyMessage}
      </p>
    );
  }

  const flat = flattenTree(buildStepTree(steps));

  return (
    <ol className="automation-steps-list" data-testid="allure-steps-readable">
      {flat.map((step) => {
        const tag = kindLabel(step.kind);
        return (
          <li
            key={step.id}
            className={`automation-step-item automation-step-item--${step.kind}`}
            style={{ marginInlineStart: `${step.depth * 1.25}rem` }}
            data-testid="allure-step-item"
            data-step-kind={step.kind}
          >
            <div className="automation-step-head">
              <span className="automation-step-order">{step.stepOrder}</span>
              {tag ? <span className="automation-step-kind">{tag}</span> : null}
              <span className="automation-step-name">{step.name}</span>
            </div>
            {step.expectedResult ? (
              <p className="automation-step-expected">
                <span className="automation-step-expected-label">Expected</span> {step.expectedResult}
              </p>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

/** Static sample steps for UI tuning on the Automation tab. */
export const AUTOMATION_UI_SAMPLE_STEPS: ReadableAllureStep[] = [
  {
    id: "sample-1",
    stepOrder: 1,
    name: "Open Projects list",
    sourceStepId: "s-1"
  },
  {
    id: "sample-2",
    stepOrder: 2,
    name: "Navigate to /projects",
    parentStepId: "s-1",
    sourceStepId: "s-2"
  },
  {
    id: "sample-3",
    stepOrder: 3,
    name: "Wait for projects table",
    parentStepId: "s-1",
    sourceStepId: "s-3"
  },
  {
    id: "sample-4",
    stepOrder: 4,
    name: "Create disposable archive test project",
    sourceStepId: "s-4"
  },
  {
    id: "sample-5",
    stepOrder: 5,
    name: "Project row visible with chosen key",
    parentStepId: "s-4",
    sourceStepId: "s-5",
    metaJson: JSON.stringify({ kind: "assert" }),
    expectedResult: "Row contains project key tcms-archive-test-*"
  },
  {
    id: "sample-6",
    stepOrder: 6,
    name: "Archive project from row actions",
    sourceStepId: "s-6"
  },
  {
    id: "sample-7",
    stepOrder: 7,
    name: "Archived project hidden when Show archived is off",
    parentStepId: "s-6",
    sourceStepId: "s-7",
    metaJson: JSON.stringify({ kind: "assert" }),
    expectedResult: "Project key not found in default list"
  },
  {
    id: "sample-8",
    stepOrder: 8,
    name: "Archived project visible when Show archived is on",
    sourceStepId: "s-8",
    metaJson: JSON.stringify({ kind: "assert" }),
    expectedResult: "Row shows archived badge/state"
  }
];
