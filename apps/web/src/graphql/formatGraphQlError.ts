type GraphQlTransportLike = {
  graphQLErrors: readonly { message: string; extensions?: unknown }[];
  networkError?: Error | null;
};

/** Formats GraphQL transport errors, appending `extensions.fixHint` when present (e.g. domain delete blocks). */
export function formatGraphQlTransportError(error: GraphQlTransportLike): string {
  const gqlParts = error.graphQLErrors.map((e) => {
    const ext = e.extensions as { fixHint?: unknown } | undefined;
    const hint =
      ext != null && typeof ext.fixHint === "string" && ext.fixHint.length > 0
        ? ` — ${ext.fixHint}`
        : "";
    return `${e.message}${hint}`;
  });
  const net = error.networkError?.message;
  const parts = [...gqlParts, net].filter(Boolean);
  return parts.length > 0 ? parts.join("; ") : "Request failed";
}
