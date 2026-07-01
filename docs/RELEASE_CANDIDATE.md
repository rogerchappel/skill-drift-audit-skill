# Release Candidate Notes

## 0.1.0

- Adds local skill drift scanner.
- Detects stale validation commands, missing safety boundaries, missing approvals, broken examples, release-note gaps, and placeholder secrets.
- Adds dry-run plan writer.
- Includes fixtures, tests, smoke command, and package dry-run.

## Verification

Passed locally on 2026-07-01:

```sh
npm run check         # pass
npm test              # pass, 7 tests
npm run smoke         # pass, stale fixture scan + dry-run plan
npm run package:smoke # pass, npm pack --dry-run
```
