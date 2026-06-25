type Props = {
  depth: number;
  hasChildren: boolean;
  isCollapsed: boolean;
  onToggle?: () => void;
};

export function RequirementHierarchyCell({ depth, hasChildren, isCollapsed, onToggle }: Props) {
  return (
    <div className="requirements-hierarchy-cell" style={{ paddingLeft: `${depth}rem` }}>
      {hasChildren ? (
        <button
          type="button"
          className="requirements-hierarchy-toggle"
          aria-expanded={!isCollapsed}
          aria-label={isCollapsed ? "Expand children" : "Collapse children"}
          data-testid="requirement-tree-toggle"
          onClick={(e) => {
            e.stopPropagation();
            onToggle?.();
          }}
        >
          <span aria-hidden="true">{isCollapsed ? "▸" : "▾"}</span>
        </button>
      ) : (
        <span className="requirements-hierarchy-leaf" aria-hidden="true" />
      )}
    </div>
  );
}
