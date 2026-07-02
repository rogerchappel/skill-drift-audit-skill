# Skill Drift Audit Skill

Audit a repo-local `SKILL.md` against README, docs, package scripts, changelog, and referenced examples. The default commands are read-only and produce deterministic Markdown or JSON reports.

## Quickstart

```sh
npm install
npm test
npm run smoke
node bin/skill-drift-audit.js scan fixtures/stale-skill --format markdown
```

## CLI

```sh
skill-drift-audit scan . --format markdown
skill-drift-audit scan fixtures/stale-skill --format json
skill-drift-audit plan . --output tmp/skill-drift-plan.md
```

`scan` prints findings. `plan` writes a dry-run refresh plan to the requested output path and never edits `SKILL.md`.

## Checks

- Missing side-effect boundaries.
- Missing approval requirements.
- Missing validation workflow.
- Validation commands in `SKILL.md` that are absent from `package.json`.
- Examples that reference absent files.
- Missing changelog or release-candidate notes.
- Obvious placeholder secret values in skill instructions.

## Safety Notes

- Reads local repo files only.
- Writes only when `plan --output <path>` is provided.
- Does not rewrite skills automatically.
- Does not perform network lookups or marketplace checks.

## Verification

```sh
npm run check
npm test
npm run smoke
npm run package:smoke
npm run release:check
```

`npm run package:smoke` performs a dry-run npm pack and asserts that the CLI,
library source, clean and stale fixtures, release notes, skill instructions,
license, and security policy are present in the tarball.
