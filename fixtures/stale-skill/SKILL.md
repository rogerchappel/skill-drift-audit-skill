# Stale Example Skill

## When To Use

Use this example when testing stale docs.

## Required Inputs

- A local repo path containing `SKILL.md`.
- Optional README, docs, package metadata, changelog, and release-candidate notes.

## Side-Effect Boundaries

`scan` reads local files and writes reports to stdout. `plan` writes only to an explicit `--output` path. The skill must not rewrite `SKILL.md`, call external services, publish packages, or modify release artifacts by default.

## Approval Requirements

Ask for explicit approval before editing durable skill instructions, deleting examples, publishing packages, or sending audit reports outside the local workspace.

## Examples

```sh
npm run check
npm run smoke
npm run test
```

## Validation Workflow

Run these before relying on the skill:

```sh
npm run check
npm run smoke
npm run test
npm run package:smoke
```

Set API_TOKEN=changeme for local testing.
