# Skill Drift Audit Skill

Audit a repo-local `SKILL.md` against README, docs, package scripts, changelog, and referenced examples. The default commands are read-only and produce deterministic Markdown or JSON reports.

## Quickstart

```sh
npm ci
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

`scan` prints findings. `plan` creates a dry-run refresh plan at the requested
output path. It refuses to overwrite any existing file, including `SKILL.md`,
README, documentation, package metadata, and other audited source files.
The `--format` value is required when the option is present and must be either
`markdown` or `json`; invalid values exit nonzero with a usage error.
Both commands reject unknown options, duplicate options, and extra positional
arguments instead of silently ignoring them. The repository path may be omitted
to scan the current directory.

## Checks

- Missing side-effect boundaries.
- Missing approval requirements.
- Missing validation workflow.
- Validation commands in `SKILL.md` that are absent from `package.json`.
- Examples that reference absent files.
- Missing changelog or release-candidate notes.
- Obvious placeholder secret values in skill instructions.

Required headings use Markdown ATX syntax at levels 1 through 6. They may have
up to three leading spaces and an optional, whitespace-separated closing `#`
sequence. Headings are recognized only in Markdown prose, not inside fenced or
indented code examples. Executable checks recognize `sh`, `bash`, and `shell`
blocks using backtick or tilde fences, including variable-length delimiters and
LF or CRLF line endings. Referenced paths under `fixtures`, `docs`, `examples`,
`bin`, and `scripts` are checked when unquoted or surrounded by ordinary single
or double shell quotes. These paths may use either repository-relative spelling,
such as `bin/example.js`, or explicit-relative spelling, such as
`./bin/example.js`. For `npm run <script> -- <args>` commands, the script name is
checked independently of arguments passed through to it. Every `npm run` segment
in ordinary `&&`, `||`, semicolon, and pipeline command chains is checked. A
segment may prefix `npm` with zero or more shell assignments (`NAME=value`) or
with `env` followed by zero or more assignments, such as
`CI=1 npm run check` or `env CI=1 npm run check`. Quoted text and shell comments
are not treated as executable command segments.

## Safety Notes

- Reads local repo files only.
- Writes only when `plan --output <path>` names a new file.
- Refuses existing output files, including normalized aliases such as
  `docs/../SKILL.md`, before creating directories or writing.
- Does not perform network lookups or marketplace checks.

## Verification

From a clean checkout, install the exact dependency tree recorded in
`package-lock.json`, then run the complete release gate:

```sh
git clone https://github.com/rogerchappel/skill-drift-audit-skill.git
cd skill-drift-audit-skill
npm ci
npm run release:check
```

For focused checks in an existing checkout:

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
