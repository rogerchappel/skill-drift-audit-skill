# Changelog

## Unreleased

- Reproducibly install dependencies with a committed npm lockfile, frozen CI
  installs, and npm dependency caching.
- Document the clean-checkout release verification path.
- Reject missing or unsupported `--format` values with a nonzero CLI usage error.
- Validate argument-bearing `npm run` commands by their package script name.

## 0.1.0

- Initial release-candidate surface for the local skill drift audit CLI.
- Includes clean and stale fixtures, dry-run refresh plan output, and package contents verification.
