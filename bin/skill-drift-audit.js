#!/usr/bin/env node
import { renderReport, scanRepo, writePlan } from "../src/index.js";

const args = process.argv.slice(2);
const command = args[0];

try {
  if (command === "scan") {
    const repoPath = args[1] ?? ".";
    const format = readOption(args, "--format") ?? "markdown";
    if (args.includes("--format") && !readOption(args, "--format")) {
      usage("--format requires a value");
    }
    if (!new Set(["markdown", "json"]).has(format)) {
      usage("--format must be markdown or json");
    }
    process.stdout.write(renderReport(scanRepo(repoPath), format));
  } else if (command === "plan") {
    const repoPath = args[1] ?? ".";
    const output = readOption(args, "--output");
    if (!output) usage("plan requires --output <path>");
    const report = scanRepo(repoPath);
    writePlan(report, output);
    process.stdout.write(`Wrote dry-run plan to ${output}\n`);
  } else {
    usage();
  }
} catch (error) {
  process.stderr.write(`skill-drift-audit: ${error.message}\n`);
  process.exitCode = 1;
}

function readOption(values, name) {
  const index = values.indexOf(name);
  const value = index === -1 ? undefined : values[index + 1];
  return value?.startsWith("--") ? undefined : value;
}

function usage(message) {
  if (message) process.stderr.write(`${message}\n`);
  process.stderr.write(`Usage:
  skill-drift-audit scan <repo> [--format markdown|json]
  skill-drift-audit plan <repo> --output <path>
`);
  process.exit(2);
}
