import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import request from "supertest";
import { createApp } from "../../src/app";

export async function createTestAgent(prefix: string) {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  const { server } = createApp(join(dir, "db.sqlite"));
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const agent = request(server);
  return {
    agent,
    async close() {
      await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    }
  };
}
