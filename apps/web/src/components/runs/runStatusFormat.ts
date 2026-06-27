export function formatRunStatusLabel(status: string) {
  if (status === "not_run" || status === "not run" || status === "notRun") {
    return "not run";
  }
  return status;
}
