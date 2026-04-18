/**
 * Dev-only route used by Playwright to verify the route error boundary.
 * Not registered in production builds (`import.meta.env.PROD`).
 */
export function E2eThrowRoute(): never {
  throw new Error("E2E deliberate render error");
}
