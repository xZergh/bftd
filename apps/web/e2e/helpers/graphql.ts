import { expect, type APIRequestContext } from "@playwright/test";

export async function graphqlQuery<T>(
  request: APIRequestContext,
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const res = await request.post("/graphql", {
    data: { query, variables },
    headers: { "Content-Type": "application/json" }
  });
  expect(res.ok()).toBeTruthy();
  const json = (await res.json()) as { data?: T; errors?: unknown[] };
  expect(json.errors, JSON.stringify(json.errors)).toBeUndefined();
  return json.data as T;
}
