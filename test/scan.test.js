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

for (const { label, command } of [
  { label: "leading assignment", command: "CI=1 npm run missing -- --verbose" },
  { label: "multiple assignments", command: "NODE_ENV=test FORCE_COLOR=0 npm run missing argument" },
  { label: "env invocation", command: "env CI=1 npm run missing -- --verbose" },
  { label: "env after a directory change", command: "cd docs && env CI=1 npm run missing argument" },
  { label: "assignment after OR", command: "npm run smoke || CI=1 npm run missing" },
  { label: "env after semicolon", command: "npm run smoke; env CI=1 npm run missing" },
  { label: "assignment in pipeline", command: "printf input | CI=1 npm run missing -- --verbose" }
]) {
  test(`validation commands support environment prefixes: ${label}`, () => {
    withCleanSkillCommand(command, (report) => {
      assert.equal(report.findings.some((finding) => finding.message.includes('"missing"')), true);
    });
  });
}

for (const lineEnding of ["LF", "CRLF"]) {
  test(`environment-prefixed commands detect present and missing scripts with ${lineEnding}`, () => {
    const separator = lineEnding === "CRLF" ? "\r\n" : "\n";
    withCleanSkillCommand(
      `env CI=1 npm run smoke -- --verbose${separator}CI=1 npm run missing argument`,
      (report) => {
        const stale = report.findings.filter((finding) => finding.code === "stale-validation-command");
        assert.deepEqual(stale.map((finding) => finding.message.includes('"missing"')), [true]);
      }
    );
  });
}

test("quoted prose and shell comments are not executable npm commands", () => {
  withCleanSkillCommand(
    'echo "npm run missing" && printf \'env CI=1 npm run also-missing\' # npm run commented-out',
    (report) => {
      assert.equal(report.findings.some((finding) => finding.code === "stale-validation-command"), false);
    }
  );
});

function withCleanSkillCommand(command, inspect) {
  const fixture = "fixtures/clean-skill/SKILL.md";
  const original = fs.readFileSync(fixture, "utf8");
  fs.writeFileSync(fixture, original.replace("npm run smoke\n", `${command}\n`));
  try {
    inspect(scanRepo("fixtures/clean-skill"));
  } finally {
    fs.writeFileSync(fixture, original);
  }
}

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

test("explicit-relative missing example paths are reported", () => {
  const fixture = "fixtures/clean-skill/SKILL.md";
  const original = fs.readFileSync(fixture, "utf8");
  fs.writeFileSync(fixture, original.replace(
    "node bin/example.js fixtures/input.json",
    "node ./bin/missing.js './fixtures/missing-single.json' \"./docs/missing-double.md\" ./examples/missing.js ./scripts/missing.js"
  ));
  try {
    const report = scanRepo("fixtures/clean-skill");
    const messages = report.findings.map((finding) => finding.message);
    for (const relative of [
      "bin/missing.js",
      "fixtures/missing-single.json",
      "docs/missing-double.md",
      "examples/missing.js",
      "scripts/missing.js"
    ]) {
      assert.equal(messages.some((message) => message.includes(relative)), true);
    }
  } finally {
    fs.writeFileSync(fixture, original);
  }
});

test("explicit-relative existing example paths are not reported", () => {
  const fixture = "fixtures/clean-skill/SKILL.md";
  const original = fs.readFileSync(fixture, "utf8");
  fs.writeFileSync(fixture, original.replace(
    "node bin/example.js fixtures/input.json",
    "node ./bin/example.js './fixtures/input.json' \"./docs/RELEASE_CANDIDATE.md\""
  ));
  try {
    const report = scanRepo("fixtures/clean-skill");
    assert.equal(report.findings.some((finding) => finding.code === "missing-example-path"), false);
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
  const output = `tmp/test-plan-${process.pid}.md`;
  fs.rmSync(output, { force: true });
  const report = scanRepo("fixtures/stale-skill");
  writePlan(report, output);
  const plan = fs.readFileSync(output, "utf8");
  assert.match(plan, /dry-run plan/i);
  assert.match(renderPlan(report), /Skill Drift Refresh Plan/);
});

for (const output of [
  "fixtures/clean-skill/SKILL.md",
  "./fixtures/clean-skill/SKILL.md",
  "fixtures/stale-skill/../clean-skill/SKILL.md"
]) {
  test(`CLI refuses existing plan output: ${output}`, () => {
    const before = fs.readFileSync("fixtures/clean-skill/SKILL.md", "utf8");
    const result = spawnSync("node", [
      "bin/skill-drift-audit.js",
      "plan",
      "fixtures/clean-skill",
      "--output",
      output
    ], { encoding: "utf8" });

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Refusing to overwrite existing file/);
    assert.equal(fs.readFileSync("fixtures/clean-skill/SKILL.md", "utf8"), before);
  });
}

test("CLI writes a plan to a new output path", () => {
  const output = `tmp/new-plan-${process.pid}.md`;
  fs.rmSync(output, { force: true });
  const result = spawnSync("node", [
    "bin/skill-drift-audit.js",
    "plan",
    "fixtures/clean-skill",
    "--output",
    output
  ], { encoding: "utf8" });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Wrote dry-run plan/);
  assert.match(fs.readFileSync(output, "utf8"), /dry-run plan/i);
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
