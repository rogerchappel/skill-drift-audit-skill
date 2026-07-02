# Security Policy

## Supported Versions

`skill-drift-audit-skill` is pre-1.0. Security fixes target the current `main`
branch until versioned releases begin.

## Reporting a Vulnerability

Report suspected vulnerabilities through GitHub private vulnerability reporting
when available, or open a minimal issue that does not include secrets, private
skill text, customer data, or proprietary repository paths.

The CLI reads local repository files and can write a dry-run plan only when
`plan --output <path>` is provided. It does not perform network calls or mutate
`SKILL.md` automatically.
