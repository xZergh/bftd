/** Default dev ports (avoid 4000 / 5173 if you run other stacks there). */
export const TCMS_DEV_API_PORT = 4010;
export const TCMS_DEV_WEB_PORT = 5180;

/** Sandbox stack for Playwright — uses plan-automation.sqlite, not tcms.sqlite. */
export const TCMS_AUTOMATION_API_PORT = 4012;
export const TCMS_AUTOMATION_WEB_PORT = 5182;

export const PLAN_AUTOMATION_PROFILE_ID = "plan-automation";

export function devWebUrl(port: number = TCMS_DEV_WEB_PORT) {
  return `http://127.0.0.1:${port}`;
}

export function devApiUrl(port: number = TCMS_DEV_API_PORT) {
  return `http://127.0.0.1:${port}`;
}

export function automationWebUrl(port: number = TCMS_AUTOMATION_WEB_PORT) {
  return `http://127.0.0.1:${port}`;
}

export function automationApiUrl(port: number = TCMS_AUTOMATION_API_PORT) {
  return `http://127.0.0.1:${port}`;
}
