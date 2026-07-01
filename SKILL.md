# Skill Drift Audit Skill

## When To Use

Use this skill when reviewing or refreshing an agent-skill repo and you need evidence that `SKILL.md` still matches README, docs, package scripts, examples, and release notes.

## Required Inputs

- A local repo path containing `SKILL.md`.
- Optional README, docs, package metadata, changelog, and release-candidate notes.

## Side-Effect Boundaries

`scan` reads local files and writes reports to stdout. `plan` writes only to an explicit `--output` path. The skill must not rewrite `SKILL.md`, call external services, publish packages, or modify release artifacts by default.

## Approval Requirements

Ask for explicit approval before editing durable skill instructions, deleting examples, publishing packages, or sending audit reports outside the local workspace.

## Examples

```sh
skill-drift-audit scan . --format markdown
skill-drift-audit scan fixtures/stale-skill --format json
skill-drift-audit plan . --output tmp/skill-drift-plan.md
```

## Validation Workflow

Run these before relying on the skill:

```sh
npm run check
npm test
npm run smoke
npm run package:smoke
```
