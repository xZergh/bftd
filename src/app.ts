import { createYoga, maskError as yogaDefaultMaskError } from "graphql-yoga";
import { GraphQLError } from "graphql";
import { createServer } from "node:http";
import { AppError } from "./domain/errors";
import { AppRuntime } from "./db/runtime";
import { buildSchema } from "./graphql/schema";
import { tryHandleDbRoute } from "./http/db-routes";
import { tryHandleRunReportRoute } from "./http/run-report-routes";

function appErrorGraphQLError(error: AppError): GraphQLError {
  return new GraphQLError(error.message, {
    extensions: {
      code: error.code,
      fixHint: error.fixHint,
      context: error.context ?? null
    }
  });
}

function unwrapAppError(error: unknown): AppError | null {
  if (error instanceof AppError) {
    return error;
  }
  if (error instanceof GraphQLError && error.originalError instanceof AppError) {
    return error.originalError;
  }
  return null;
}

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
        const appError = unwrapAppError(error);
        if (appError) {
          return appErrorGraphQLError(appError);
        }
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
    if (tryHandleRunReportRoute(req, res)) {
      return;
    }
    if (await tryHandleDbRoute(req, res, runtime)) {
      return;
    }
    return yoga(req, res);
  });

  return { server, runtime };
}
