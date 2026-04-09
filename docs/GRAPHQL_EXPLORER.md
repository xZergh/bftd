# GraphQL Explorer (TCMS)

TCMS serves the **GraphQL Explorer** (interactive query IDE) at the same URL as the API. It is provided by [GraphQL Yoga](https://the-guild.dev/graphql/yoga-server) and uses the **Explorer** sidebar to browse the schema and build queries.

## Open the Explorer

1. Start the API (see [`README.md`](../README.md) or [`LOCAL_MANUAL_TESTING.md`](LOCAL_MANUAL_TESTING.md)).
2. In a browser, open **`http://localhost:<PORT>/graphql`** (default port **4000**).

Use a normal browser navigation (GET). Do not send `POST` with `application/json` from the address bar—the Explorer is the HTML page returned when the client asks for HTML (browsers send `Accept: text/html`).

If you only need the JSON API, use `POST /graphql` with a JSON body (`query`, `variables`, `operationName`) as documented in [`API_CONTRACTS.md`](API_CONTRACTS.md).

## Using the Explorer

- **Left / Explorer panel:** Expand **Query** and **Mutation** to see operations and fields. Click fields to insert them into the query editor.
- **Center:** Edit the GraphQL document. Variables go in the **Query Variables** panel (JSON object below the editor).
- **Play button:** Execute the operation against this server (`POST` to `/graphql`).
- **Tabs:** You can keep multiple operations in tabs; each run uses the current document and variables.

## Schema source of truth

The committed SDL snapshot is [`contracts/graphql-schema.snapshot.graphql`](../contracts/graphql-schema.snapshot.graphql). Regenerate it after schema changes with `npm run ci:schema:update` (see [`DEVELOPER_GUIDE.md`](DEVELOPER_GUIDE.md)).

## Production note

Schema **introspection** may be restricted in hardened deployments. If Explorer cannot load the schema, use the SDL snapshot file and a desktop GraphQL client, or rely on contract tests and docs.
