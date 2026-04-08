import { printSchema } from "graphql";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { buildSchema } from "../../src/graphql/schema";

const SNAPSHOT_PATH = join(process.cwd(), "contracts", "graphql-schema.snapshot.graphql");

function main() {
  const current = `${printSchema(buildSchema())}\n`;
  if (!existsSync(SNAPSHOT_PATH)) {
    throw new Error(
      `Schema snapshot missing at ${SNAPSHOT_PATH}. Run: npm run ci:schema:update`
    );
  }

  const baseline = readFileSync(SNAPSHOT_PATH, "utf8");
  if (baseline !== current) {
    const allowBreaking = process.env.ALLOW_BREAKING_SCHEMA === "1";
    if (!allowBreaking) {
      throw new Error(
        "GraphQL schema diff detected. Update snapshot with `npm run ci:schema:update` and include approval artifacts for breaking changes."
      );
    }
    console.warn("Schema diff detected but ALLOW_BREAKING_SCHEMA=1 set; continuing.");
  } else {
    console.log("Schema contract check passed.");
  }
}

main();
