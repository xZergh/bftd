import { createYoga, maskError as yogaDefaultMaskError } from "graphql-yoga";
import { createServer } from "node:http";
import { createDb } from "./db/client";
import { initSqlite } from "./db/init";
import { TcmsService } from "./domain/service";
import { buildSchema } from "./graphql/schema";
import { tryServeSwagger } from "./http/swagger";

export function createApp(dbPath: string) {
  initSqlite(dbPath);
  const db = createDb(dbPath);
  const service = new TcmsService(db);

  const yoga = createYoga({
    schema: buildSchema(),
    context: { service },
    graphqlEndpoint: "/graphql",
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

  const server = createServer((req, res) => {
    if (tryServeSwagger(req, res)) {
      return;
    }
    return yoga(req, res);
  });
  return { server };
}
