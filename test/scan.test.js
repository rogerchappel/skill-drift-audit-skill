import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { renderPlan, renderReport, scanRepo, writePlan } from "../src/index.js";

test("clean skill fixture has no high findings", () => {
  const report = scanRepo("fixtures/clean-skill");
  assert.equal(report.summary.high, 0);
  assert.equal(report.summary.medium, 0);
});

test("stale skill fixture reports missing safety sections", () => {
  const report = scanRepo("fixtures/stale-skill");
  assert.equal(report.summary.high >= 2, true);
  assert.equal(report.findings.some((finding) => finding.code === "missing-side-effect-boundaries"), true);
  assert.equal(report.findings.some((finding) => finding.code === "missing-approval-requirements"), true);
});

test("stale skill detects stale validation command", () => {
  const report = scanRepo("fixtures/stale-skill");
  assert.equal(report.findings.some((finding) => finding.message.includes('"smoke"')), true);
  assert.equal(report.findings.some((finding) => finding.message.includes('"release"')), true);
});

test("stale skill detects missing example path and placeholder secret", () => {
  const report = scanRepo("fixtures/stale-skill");
  assert.equal(report.findings.some((finding) => finding.code === "missing-example-path"), true);
  assert.equal(report.findings.some((finding) => finding.code === "placeholder-secret"), true);
});

test("example headings do not satisfy required skill sections", () => {
  const report = scanRepo("fixtures/markdown-context-skill");
  const codes = new Set(report.findings.map((finding) => finding.code));
  assert.equal(codes.has("missing-required-inputs"), true);
  assert.equal(codes.has("missing-side-effect-boundaries"), true);
  assert.equal(codes.has("missing-approval-requirements"), true);
  assert.equal(codes.has("missing-validation-workflow"), true);
});

test("variable-length tilde and backtick fences expose executable drift", () => {
  const report = scanRepo("fixtures/markdown-context-skill");
  const messages = report.findings.map((finding) => finding.message);
  assert.equal(messages.some((message) => message.includes('"missing-tilde"')), true);
  assert.equal(messages.some((message) => message.includes('"missing-backtick"')), true);
  assert.equal(messages.some((message) => message.includes("scripts/missing-tilde.js")), true);
  assert.equal(messages.some((message) => message.includes("examples/missing-backtick.js")), true);
});

test("CRLF fenced commands are checked", () => {
  const fixture = "fixtures/markdown-context-skill/SKILL.md";
  const original = fs.readFileSync(fixture, "utf8");
  fs.writeFileSync(fixture, original.replace(/\n/g, "\r\n"));
  try {
    const report = scanRepo("fixtures/markdown-context-skill");
    assert.equal(report.findings.some((finding) => finding.message.includes('"missing-tilde"')), true);
    assert.equal(report.findings.some((finding) => finding.message.includes("examples/missing-backtick.js")), true);
  } finally {
    fs.writeFileSync(fixture, original);
  }
});

test("renders JSON report", () => {
  const output = renderReport(scanRepo("fixtures/clean-skill"), "json");
  const parsed = JSON.parse(output);
  assert.equal(parsed.evidence.hasReadme, true);
});

test("writes dry-run plan", () => {
  const output = "tmp/test-plan.md";
  const report = scanRepo("fixtures/stale-skill");
  writePlan(report, output);
  const plan = fs.readFileSync(output, "utf8");
  assert.match(plan, /dry-run plan/i);
  assert.match(renderPlan(report), /Skill Drift Refresh Plan/);
});

test("CLI scan emits markdown", () => {
  const output = execFileSync("node", ["bin/skill-drift-audit.js", "scan", "fixtures/stale-skill", "--format", "markdown"], {
    encoding: "utf8"
  });
  assert.match(output, /# Skill Drift Audit: stale-skill/);
  assert.match(output, /Findings:/);
});
