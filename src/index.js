import fs from "node:fs";
import path from "node:path";

export function scanRepo(repoPath) {
  const absolute = path.resolve(repoPath);
  const skillPath = path.join(absolute, "SKILL.md");
  if (!fs.existsSync(skillPath)) throw new Error(`Missing SKILL.md in ${repoPath}`);

  const skill = fs.readFileSync(skillPath, "utf8");
  const packageJson = readJson(path.join(absolute, "package.json"));
  const scripts = packageJson?.scripts ?? {};
  const docs = listDocs(absolute);
  const findings = [
    ...checkRequiredSections(skill),
    ...checkValidationCommands(skill, scripts),
    ...checkExamples(skill, absolute),
    ...checkReleaseEvidence(absolute, docs),
    ...checkPlaceholderSecrets(skill)
  ];

  return {
    repoPath: absolute,
    summary: summarize(findings),
    findings,
    evidence: {
      hasReadme: fs.existsSync(path.join(absolute, "README.md")),
      docs,
      scripts: Object.keys(scripts).sort()
    },
    plan: buildPlan(findings)
  };
}

export function renderReport(report, format = "markdown") {
  if (format === "json") return `${JSON.stringify(report, null, 2)}\n`;
  const lines = [
    `# Skill Drift Audit: ${path.basename(report.repoPath)}`,
    "",
    `Findings: ${report.summary.total}`,
    `High: ${report.summary.high}`,
    `Medium: ${report.summary.medium}`,
    `Low: ${report.summary.low}`,
    "",
    "## Findings",
    ""
  ];
  if (report.findings.length === 0) {
    lines.push("No drift findings.");
  } else {
    for (const finding of report.findings) {
      lines.push(`- ${finding.severity}: ${finding.message}`);
      lines.push(`  Action: ${finding.action}`);
    }
  }
  lines.push("", "## Evidence", "");
  lines.push(`- README: ${report.evidence.hasReadme ? "present" : "missing"}`);
  lines.push(`- Docs: ${report.evidence.docs.length ? report.evidence.docs.join(", ") : "none"}`);
  lines.push(`- Package scripts: ${report.evidence.scripts.length ? report.evidence.scripts.join(", ") : "none"}`);
  return `${lines.join("\n")}\n`;
}

export function writePlan(report, outputPath) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, renderPlan(report));
}

export function renderPlan(report) {
  const lines = [
    `# Skill Drift Refresh Plan: ${path.basename(report.repoPath)}`,
    "",
    "This is a dry-run plan. Review and edit files manually.",
    ""
  ];
  if (report.plan.length === 0) {
    lines.push("No refresh actions required.");
  } else {
    for (const item of report.plan) {
      lines.push(`- [ ] ${item}`);
    }
  }
  return `${lines.join("\n")}\n`;
}

function checkRequiredSections(skill) {
  const checks = [
    ["Side-Effect Boundaries", "high", "Add explicit side-effect boundaries."],
    ["Approval Requirements", "high", "Document approval requirements before external actions."],
    ["Validation Workflow", "medium", "Document validation commands."],
    ["Required Inputs", "medium", "List required tools and inputs."]
  ];
  return checks
    .filter(([heading]) => !hasHeading(skill, heading))
    .map(([heading, severity, action]) => ({
      code: `missing-${slug(heading)}`,
      severity,
      message: `SKILL.md is missing "${heading}".`,
      action
    }));
}

function checkValidationCommands(skill, scripts) {
  const commands = [...new Set(extractCommands(skill).filter((command) => command.startsWith("npm run ")))];
  const scriptNames = new Set(Object.keys(scripts));
  return commands
    .map((command) => command.replace(/^npm run /, "").trim())
    .filter((name) => name && !scriptNames.has(name))
    .map((name) => ({
      code: "stale-validation-command",
      severity: "high",
      message: `SKILL.md references npm script "${name}" but package.json does not define it.`,
      action: `Update SKILL.md or add package script "${name}".`
    }));
}

function checkExamples(skill, repoPath) {
  const commands = extractCommands(skill);
  const referenced = new Set();
  for (const command of commands) {
    for (const token of command.split(/\s+/)) {
      if (/^(fixtures|docs|examples|bin|scripts)\//.test(token)) referenced.add(token.replace(/[),.;]$/, ""));
    }
  }
  return [...referenced]
    .filter((relative) => !fs.existsSync(path.join(repoPath, relative)))
    .map((relative) => ({
      code: "missing-example-path",
      severity: "medium",
      message: `Example references missing path ${relative}.`,
      action: `Create ${relative} or remove the stale example.`
    }));
}

function checkReleaseEvidence(repoPath, docs) {
  const hasChangelog = fs.existsSync(path.join(repoPath, "CHANGELOG.md"));
  const hasReleaseDoc = docs.some((doc) => /release|candidate|changelog/i.test(doc));
  if (hasChangelog || hasReleaseDoc) return [];
  return [{
    code: "missing-release-evidence",
    severity: "low",
    message: "No changelog or release-candidate notes were found.",
    action: "Add CHANGELOG.md or docs/RELEASE_CANDIDATE.md before packaging."
  }];
}

function checkPlaceholderSecrets(skill) {
  const pattern = /(api[_-]?key|token|secret)\s*=\s*(changeme|example|test|placeholder)/i;
  if (!pattern.test(skill)) return [];
  return [{
    code: "placeholder-secret",
    severity: "medium",
    message: "SKILL.md includes an obvious placeholder secret example.",
    action: "Replace secret-like examples with non-secret fixture names."
  }];
}

function extractCommands(markdown) {
  const commands = [];
  const fencePattern = /```(?:sh|bash|shell)?\n([\s\S]*?)```/g;
  let match;
  while ((match = fencePattern.exec(markdown))) {
    for (const line of match[1].split(/\r?\n/)) {
      const command = line.trim().replace(/^\$ /, "");
      if (command) commands.push(command);
    }
  }
  return commands;
}

function listDocs(repoPath) {
  const docsPath = path.join(repoPath, "docs");
  if (!fs.existsSync(docsPath)) return [];
  return fs.readdirSync(docsPath)
    .filter((name) => name.toLowerCase().endsWith(".md"))
    .sort()
    .map((name) => `docs/${name}`);
}

function summarize(findings) {
  return {
    total: findings.length,
    high: findings.filter((finding) => finding.severity === "high").length,
    medium: findings.filter((finding) => finding.severity === "medium").length,
    low: findings.filter((finding) => finding.severity === "low").length
  };
}

function buildPlan(findings) {
  return findings.map((finding) => finding.action);
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function hasHeading(markdown, heading) {
  return new RegExp(`^#{1,3}\\s+${escapeRegExp(heading)}\\s*$`, "im").test(markdown);
}

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
