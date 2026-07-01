# Product Requirements: Skill Drift Audit Skill

## Problem

Agent skills become risky when durable instructions lag behind the project they describe. Maintainers need a local audit that catches stale validation commands, missing approval boundaries, and broken examples before recommending or packaging a skill.

## Goals

- Read local `SKILL.md`, README, docs, package scripts, and changelog files.
- Detect stale validation commands, missing side-effect boundaries, missing approval notes, and examples that reference absent files.
- Emit deterministic Markdown and JSON drift reports.
- Produce a dry-run refresh plan without editing source files.
- Include fixture-backed tests for clean, stale, and partially documented skill repos.

## Non-Goals

- Network lookups or registry checks.
- Automatic rewriting in V1.
- Deep secret scanning beyond obvious placeholder warnings.

## Success Criteria

- Clean fixture produces no high-severity findings.
- Stale fixture produces actionable findings.
- CLI smoke writes a plan only when an output path is supplied.
