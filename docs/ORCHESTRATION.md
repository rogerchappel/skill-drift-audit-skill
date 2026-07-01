# Orchestration

## Default Flow

1. Run `skill-drift-audit scan . --format markdown` from a skill repo.
2. Review high and medium findings.
3. Run `skill-drift-audit plan . --output tmp/skill-drift-plan.md`.
4. Apply edits manually in a separate reviewed change.
5. Re-run repo validation commands.

## Boundaries

- Do not let this tool automatically rewrite durable instructions.
- Do not treat missing changelog evidence as proof that a release is invalid.
- Keep reports local unless the user asks to share them.

## CI Suggestion

```sh
npm run check
npm test
npm run smoke
```
