import { createApp } from "./app";
import { DEFAULT_DATABASE_PROFILE_ID, profileIdFromPath, resolveDatabasePath } from "./db/registry";
import { TCMS_DEV_API_PORT } from "./domain/automation/constants";

const port = Number(process.env.PORT ?? TCMS_DEV_API_PORT);
const dbPath = process.env.DB_PATH ?? resolveDatabasePath(DEFAULT_DATABASE_PROFILE_ID);
const { server } = createApp(dbPath);

server.listen(port, () => {
  const profile = profileIdFromPath(dbPath) ?? "custom";
  console.log(`TCMS API listening on http://localhost:${port}/graphql (${profile}: ${dbPath})`);
});
