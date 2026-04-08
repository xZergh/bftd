import { printSchema } from "graphql";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { buildSchema } from "../../src/graphql/schema";

const SNAPSHOT_PATH = join(process.cwd(), "contracts", "graphql-schema.snapshot.graphql");

function main() {
  const schema = buildSchema();
  const sdl = printSchema(schema);
  mkdirSync(dirname(SNAPSHOT_PATH), { recursive: true });
  writeFileSync(SNAPSHOT_PATH, `${sdl}\n`, "utf8");
  console.log(`Updated schema snapshot at ${SNAPSHOT_PATH}`);
}

main();
