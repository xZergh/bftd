import { createSchema } from "graphql-yoga";
import { TcmsService } from "../domain/service";
import { resolvers } from "./resolvers";
import { typeDefs } from "./type-defs";

type Context = { service: TcmsService };

export function buildSchema() {
  return createSchema<Context>({
    typeDefs,
    resolvers
  });
}
