/**
 * Allure's Windows launcher expects either JAVA_HOME (with bin/java.exe) or java on PATH.
 * GUI shells often have Oracle's java8path on PATH while npm/Cursor jobs do not — we fix that here.
 */
const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");

const WIN_JAVA_CANDIDATES = [
  String.raw`C:\Program Files (x86)\Common Files\Oracle\Java\java8path\java.exe`,
  String.raw`C:\Program Files\Common Files\Oracle\Java\javapath\java.exe`,
  String.raw`C:\Program Files\Common Files\Oracle\Java\java8path\java.exe`
];

function resolveJavaExecutable() {
  if (process.platform === "win32") {
    for (const p of WIN_JAVA_CANDIDATES) {
      if (fs.existsSync(p)) {
        return p;
      }
    }
  }
  try {
    if (process.platform === "win32") {
      const out = execSync("where java", { encoding: "utf8", shell: true }).trim();
      if (/Could not find files/i.test(out)) {
        return null;
      }
      const line = out
        .split(/\r?\n/)
        .map((s) => s.trim())
        .find((l) => /\.exe$/i.test(l));
      return line && fs.existsSync(line) ? line : null;
    }
    const out = execSync("command -v java", { encoding: "utf8", shell: "/bin/sh" }).trim();
    const first = out.split("\n")[0]?.trim();
    return first && fs.existsSync(first) ? first : null;
  } catch {
    return null;
  }
}

function ensureJavaForAllure() {
  if (process.env.JAVA_HOME) {
    return;
  }
  const javaExe = resolveJavaExecutable();
  if (!javaExe) {
    return;
  }
  const javaDir = path.dirname(javaExe);
  const base = path.basename(javaDir).toLowerCase();
  if (base === "bin") {
    process.env.JAVA_HOME = path.dirname(javaDir);
    return;
  }
  const sep = path.delimiter;
  process.env.PATH = `${javaDir}${sep}${process.env.PATH || ""}`;
}

ensureJavaForAllure();

const allure = require("allure-commandline");

const resultsDir = "artifacts/allure-results";
const outDir = "artifacts/allure-report";
const committedSingle = path.join("docs", "reports", "allure-report.html");

const cp = allure([
  "generate",
  resultsDir,
  "-o",
  outDir,
  "--clean",
  "--single-file"
]);

cp.on("close", (code) => {
  if (typeof code !== "number" || code !== 0) {
    process.exit(typeof code === "number" ? code : 1);
  }
  try {
    const indexHtml = path.join(outDir, "index.html");
    if (fs.existsSync(indexHtml)) {
      fs.mkdirSync(path.dirname(committedSingle), { recursive: true });
      fs.copyFileSync(indexHtml, committedSingle);
      console.log(`Copied single-file report to ${committedSingle}`);
    }
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
  process.exit(0);
});

cp.on("error", (err) => {
  console.error(err);
  process.exit(1);
});
