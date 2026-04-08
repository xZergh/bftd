import { createYoga } from "graphql-yoga";
import { createServer } from "node:http";
import { createDb } from "./db/client";
import { initSqlite } from "./db/init";
import { TcmsService } from "./domain/service";
import { buildSchema } from "./graphql/schema";

export function createApp(dbPath: string) {
  initSqlite(dbPath);
  const db = createDb(dbPath);
  const service = new TcmsService(db);

  const yoga = createYoga({
    schema: buildSchema(),
    context: { service },
    graphqlEndpoint: "/graphql"
  });

  const server = createServer(yoga);
  return { server };
}
