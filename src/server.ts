import { createApp } from "./app";

const port = Number(process.env.PORT ?? 4000);
const dbPath = process.env.DB_PATH ?? "./data/tcms.sqlite";

const { server } = createApp(dbPath);

server.listen(port, () => {
  console.log(`TCMS API listening on http://localhost:${port}/graphql`);
});
