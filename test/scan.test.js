import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import test from "node:test";
import { renderPlan, renderReport, scanRepo, writePlan } from "../src/index.js";

test("clean skill fixture has no high findings", () => {
  const report = scanRepo("fixtures/clean-skill");
  assert.equal(report.summary.high, 0);
  assert.equal(report.summary.medium, 0);
});

test("validation commands allow arguments after the npm script name", () => {
  const report = scanRepo("fixtures/clean-skill");
  assert.equal(report.findings.some((finding) => finding.code === "stale-validation-command"), false);
});

test("validation commands inspect every npm run in a shell command chain", () => {
  const fixture = "fixtures/clean-skill/SKILL.md";
  const original = fs.readFileSync(fixture, "utf8");
  fs.writeFileSync(fixture, original.replace("npm run smoke\n", "npm run smoke && npm run missing\n"));
  try {
    const report = scanRepo("fixtures/clean-skill");
    assert.equal(report.findings.some((finding) => finding.message.includes('"missing"')), true);
  } finally {
    fs.writeFileSync(fixture, original);
  }
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

for (const heading of [
  "# Required Inputs",
  "#### Required Inputs",
  "###### Required Inputs",
  "## Required Inputs ##",
  "   ##### Required Inputs ###"
]) {
  test(`valid ATX heading satisfies a required skill section: ${heading}`, () => {
    const fixture = "fixtures/clean-skill/SKILL.md";
    const original = fs.readFileSync(fixture, "utf8");
    fs.writeFileSync(fixture, original.replace("## Required Inputs", heading));
    try {
      const report = scanRepo("fixtures/clean-skill");
      assert.equal(report.findings.some((finding) => finding.code === "missing-required-inputs"), false);
    } finally {
      fs.writeFileSync(fixture, original);
    }
  });
}

test("shell-quoted missing example paths are reported", () => {
  const fixture = "fixtures/clean-skill/SKILL.md";
  const original = fs.readFileSync(fixture, "utf8");
  fs.writeFileSync(fixture, original.replace(
    "node bin/example.js fixtures/input.json",
    "node bin/example.js \"fixtures/missing-double.json\" 'docs/missing-single.md'"
  ));
  try {
    const report = scanRepo("fixtures/clean-skill");
    const messages = report.findings.map((finding) => finding.message);
    assert.equal(messages.some((message) => message.includes("fixtures/missing-double.json")), true);
    assert.equal(messages.some((message) => message.includes("docs/missing-single.md")), true);
  } finally {
    fs.writeFileSync(fixture, original);
  }
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

for (const cliArgs of [
  ["scan", "fixtures/clean-skill", "--format"],
  ["scan", "fixtures/clean-skill", "--format", "yaml"]
]) {
  test(`CLI rejects invalid format arguments: ${cliArgs.join(" ")}`, () => {
    const result = spawnSync("node", ["bin/skill-drift-audit.js", ...cliArgs], { encoding: "utf8" });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /--format (?:requires|must be)/);
  });
}

for (const cliArgs of [
  ["scan", "fixtures/clean-skill", "--bogus"],
  ["scan", "fixtures/clean-skill", "trailing"],
  ["scan", "fixtures/clean-skill", "--format", "json", "trailing"],
  ["plan", "fixtures/clean-skill", "--output", "tmp/plan.md", "trailing"],
  ["plan", "fixtures/clean-skill", "--bogus", "value"]
]) {
  test(`CLI rejects unknown options and trailing arguments: ${cliArgs.join(" ")}`, () => {
    const result = spawnSync("node", ["bin/skill-drift-audit.js", ...cliArgs], { encoding: "utf8" });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /(?:unknown option|unexpected argument)/);
    assert.match(result.stderr, /Usage:/);
  });
}
