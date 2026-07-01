# Clean Example Skill

## When To Use

Use this example when testing a fully documented skill.

## Required Inputs

- Local fixtures in `fixtures/input.json`.

## Side-Effect Boundaries

Default commands read local files and write reports to stdout only.

## Approval Requirements

Ask before editing files, calling external services, or publishing packages.

## Examples

```sh
node bin/example.js fixtures/input.json
```

## Validation Workflow

```sh
npm run check
npm test
npm run smoke
```
