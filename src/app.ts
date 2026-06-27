import { createYoga, maskError as yogaDefaultMaskError } from "graphql-yoga";
import { createServer } from "node:http";
import { AppRuntime } from "./db/runtime";
import { buildSchema } from "./graphql/schema";
import { tryHandleDbRoute } from "./http/db-routes";

export function createApp(dbPath: string) {
  const runtime = new AppRuntime(dbPath);

  const yoga = createYoga({
    schema: buildSchema(),
    context: () => ({ service: runtime.service }),
    graphqlEndpoint: "/graphql",
    graphiql: {
      title: "TCMS GraphQL",
      defaultQuery: `query Projects {\n  projects {\n    id\n    key\n    name\n  }\n}`
    },
    maskedErrors: {
      maskError(error, message, isDev) {
        const ext = error as { extensions?: { code?: unknown } };
        if (
          error instanceof Error &&
          error.name === "GraphQLError" &&
          typeof ext.extensions?.code === "string" &&
          ext.extensions.code !== "INTERNAL_SERVER_ERROR"
        ) {
          return error;
        }
        return yogaDefaultMaskError(error, message, isDev);
      }
    }
  });

  const server = createServer(async (req, res) => {
    if (await tryHandleDbRoute(req, res, runtime)) {
      return;
    }
    return yoga(req, res);
  });

  return { server, runtime };
}
