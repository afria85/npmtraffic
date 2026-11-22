#!/usr/bin/env node
// Summarize Playwright's JSON report without echoing raw console messages, URLs or RSC keys.
// Counts are observations, NOT an assertion that browser navigation is reliable.
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";

const reportPath = process.argv[2] ?? "test-results/cloud-qa/report.json";
const summaryPath = "test-results/cloud-qa/summary.md";
const exactCommit = process.env.NPMTRAFFIC_QA_COMMIT ?? null;

let report;
try {
  report = JSON.parse(readFileSync(reportPath, "utf8"));
} catch {
  const message = "Cloud QA evidence unavailable or invalid: report.json could not be parsed.";
  const note = "## Cloud Browser QA diagnostics\n\n**BLOCKED:** " + message + "\n";
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, note);
  console.error(message);
  process.exit(1);
}

const rows = [];
const anomalies = [];
function visit(suites) {
  for (const suite of suites ?? []) {
    for (const spec of suite.specs ?? []) {
      for (const t of spec.tests ?? []) {
        const last = t.results?.at(-1);
        const attachment = last?.attachments?.find(a => a.name === "sanitized-browser-evidence");
        if (!attachment?.body) {
          anomalies.push("Missing sanitized evidence attachment for a test: " + t.projectName);
          rows.push({ project: t.projectName, width: "—", mode: "—", rscTransfer: "—", result: t.status ?? "unknown",
            access: "—", canceled: "—", other: "—", console: "—", capped: "—" });
          continue;
        }
        try {
          const ev = JSON.parse(Buffer.from(attachment.body, "base64").toString("utf8"));
          if (!ev.commit || (exactCommit && ev.commit !== exactCommit) ||
              (ev.requestedCommit && ev.requestedCommit !== ev.commit)) {
            anomalies.push("Exact-HEAD mismatch for project " + t.projectName);
          }
          const errors = Array.isArray(ev.errors) ? ev.errors : [];
          const requests = Array.isArray(ev.requests) ? ev.requests : [];
          const access = errors.filter(e => e.event === "pageerror" && e.kind === "access-control").length;
          const other = errors.filter(e => e.event === "pageerror" && e.kind !== "access-control").length;
          const consoleErrors = errors.filter(e => e.event === "console").length;
          const canceled = requests.filter(r => r.failed === "canceled").length;
          const mode = ev.checks?.find(c => c.historyWaitUntil)?.historyWaitUntil ?? "baseline";
          const rscTransfer = ev.checks?.find(c => c.rscProxyTransfer)?.rscProxyTransfer ?? "streamed-default";
          rows.push({
            project: ev.project ?? t.projectName, width: ev.viewport?.width ?? "—", mode, rscTransfer,
            result: t.status ?? "unknown", access, canceled, other,
            console: consoleErrors, capped: errors.length >= 100 || requests.length >= 250 ? "YES" : "no",
          });
        } catch {
          anomalies.push("Unreadable sanitized evidence attachment for project " + t.projectName);
        }
      }
    }
    visit(suite.suites);
  }
}
visit(report.suites);

if (rows.length !== (report.stats?.expected ?? rows.length) + (report.stats?.skipped ?? 0)) {
  anomalies.push("Parsed test count differs from report stats; inspect report.json.");
}
const safe = value => String(value).replace(/[|\r\n<>]/g, " ").slice(0, 90);
const sum = name => rows.reduce((n, row) => n + (typeof row[name] === "number" ? row[name] : 0), 0);
const markdown = [
  "## Cloud Browser QA — functional tests and runtime exceptions",
  "",
  "Exact tested commit: `" + safe(exactCommit ?? "local / not supplied") + "`",
  "",
  "**Important:** a green navigation assertion does not imply zero RSC/access-control exceptions.",
  "These counts describe sanitized local-fixture evidence, not physical Safari or the authenticated Preview.",
  "",
  "| Project | Width | History wait | RSC proxy transfer | Result | access-control pageerrors | Canceled requests | Other pageerrors | Console errors | Capture capped |",
  "| --- | ---: | --- | --- | --- | ---: | ---: | ---: | ---: | --- |",
  ...rows.map(r => "| " + [r.project, r.width, r.mode, r.rscTransfer, r.result, r.access, r.canceled, r.other, r.console, r.capped].map(safe).join(" | ") + " |"),
  "",
  "**Totals captured:** access-control pageerrors **" + sum("access") + "**; canceled requests **" +
    sum("canceled") + "**; other pageerrors **" + sum("other") + "**; console errors **" + sum("console") + "**.",
  "",
  "Playwright: " + (report.stats?.expected ?? "?") + " expected, " +
    (report.stats?.unexpected ?? "?") + " unexpected, " +
    (report.stats?.skipped ?? "?") + " skipped, " + (report.stats?.flaky ?? "?") + " flaky.",
  "",
  "RSC exception root cause remains UNRESOLVED; no exception type is silently treated as an app fix.",
  "",
];
if (anomalies.length) {
  markdown.push("**EVIDENCE QUALITY WARNING:** " + anomalies.length + " problem(s) detected.", "");
}
const output = markdown.join("\n");
writeFileSync(summaryPath, output);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, output);
console.log(output);
if (anomalies.length) {
  for (const issue of anomalies) console.error(issue);
  process.exitCode = 1;
}
