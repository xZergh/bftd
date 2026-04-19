import { Navigate } from "react-router-dom";
import { readLastProjectPath } from "../navigation/lastProjectPath";

export function HomePage() {
  const to = readLastProjectPath() ?? "/projects";
  return <Navigate to={to} replace />;
}
