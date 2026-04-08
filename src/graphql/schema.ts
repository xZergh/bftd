import { createSchema } from "graphql-yoga";
import { GraphQLScalarType, Kind } from "graphql";
import { TcmsService } from "../domain/service";
import { resolvers } from "./resolvers";
import { typeDefs } from "./type-defs";

const DateScalar = new GraphQLScalarType({
  name: "Date",
  description: "ISO-8601 calendar date (YYYY-MM-DD)",
  serialize(value: unknown) {
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    if (typeof value === "string") return value.slice(0, 10);
    return String(value);
  },
  parseValue(value: unknown) {
    if (typeof value !== "string") throw new TypeError("Date must be a string");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new TypeError("Invalid Date format");
    return value;
  },
  parseLiteral(ast) {
    if (ast.kind !== Kind.STRING) throw new TypeError("Date must be a string");
    return ast.value;
  }
});

const DateTimeScalar = new GraphQLScalarType({
  name: "DateTime",
  description: "ISO-8601 timestamp",
  serialize(value: unknown) {
    if (value instanceof Date) return value.toISOString();
    if (typeof value === "string") {
      const d = new Date(value);
      if (!Number.isNaN(d.getTime())) return d.toISOString();
    }
    throw new TypeError("Invalid DateTime for serialization");
  },
  parseValue(value: unknown) {
    if (value instanceof Date) return value;
    if (typeof value === "string") {
      const d = new Date(value);
      if (!Number.isNaN(d.getTime())) return d;
    }
    throw new TypeError("Invalid DateTime");
  },
  parseLiteral(ast) {
    if (ast.kind !== Kind.STRING) throw new TypeError("DateTime must be a string");
    const d = new Date(ast.value);
    if (Number.isNaN(d.getTime())) throw new TypeError("Invalid DateTime literal");
    return d;
  }
});

type Context = { service: TcmsService };

export function buildSchema() {
  return createSchema<Context>({
    typeDefs,
    resolvers: {
      Date: DateScalar,
      DateTime: DateTimeScalar,
      ...resolvers
    }
  });
}
