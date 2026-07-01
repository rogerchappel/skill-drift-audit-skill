# Stale Example Skill

## When To Use

Use this example when testing stale docs.

## Examples

```sh
npm run check
npm run smoke
node bin/missing.js fixtures/missing.json
```

## Validation Workflow

```sh
npm run check
npm run smoke
npm run release
```

Set API_TOKEN=changeme for local testing.
