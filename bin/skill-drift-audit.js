#!/usr/bin/env node
import { renderReport, scanRepo, writePlan } from "../src/index.js";

const args = process.argv.slice(2);
const command = args[0];

try {
  if (command === "scan") {
    const { repoPath, options } = parseArguments(args.slice(1), new Set(["--format"]));
    const format = options.get("--format") ?? "markdown";
    if (!new Set(["markdown", "json"]).has(format)) {
      usage("--format must be markdown or json");
    }
    process.stdout.write(renderReport(scanRepo(repoPath), format));
  } else if (command === "plan") {
    const { repoPath, options } = parseArguments(args.slice(1), new Set(["--output"]));
    const output = options.get("--output");
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

function parseArguments(values, allowedOptions) {
  let repoPath;
  const options = new Map();
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value.startsWith("--")) {
      if (!allowedOptions.has(value)) usage(`unknown option: ${value}`);
      if (options.has(value)) usage(`option may only be provided once: ${value}`);
      const optionValue = values[index + 1];
      if (!optionValue || optionValue.startsWith("--")) usage(`${value} requires a value`);
      options.set(value, optionValue);
      index += 1;
    } else if (repoPath === undefined) {
      repoPath = value;
    } else {
      usage(`unexpected argument: ${value}`);
    }
  }
  return { repoPath: repoPath ?? ".", options };
}

function usage(message) {
  if (message) process.stderr.write(`${message}\n`);
  process.stderr.write(`Usage:
  skill-drift-audit scan <repo> [--format markdown|json]
  skill-drift-audit plan <repo> --output <path>
`);
  process.exit(2);
}
