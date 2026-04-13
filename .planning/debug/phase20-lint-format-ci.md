---
status: investigating
trigger: "CI lint-format failing on phase20-ci-guardrails-final — diagnose only"
created: 2026-04-13
updated: 2026-04-13
---

## Current Focus

hypothesis: format:check (biome check) detecting format drift on branch files; lint may also have issues
test: run `bun run lint` and `bun run format:check` locally, capture tail output
expecting: enumerate files/rules in violation
next_action: run both scripts and categorise output

## Symptoms

expected: CI lint-format job green on PR #4
actual: lint-format job failing; plan 20-02 notes "format:check failed on branch (Biome format drift)"
errors: pending capture
reproduction: `bun run lint` and `bun run format:check` from repo root
started: after Phase 20 CI guardrails changes

## Eliminated

## Evidence

- checked: .github/workflows/ci.yml lint-format job
  found: runs `bun run lint` then `bun run format:check` on ubuntu-latest with frozen-lockfile
- checked: package.json scripts
  found: lint = `biome lint src tests packages`; format:check = `biome check src tests packages` (note: `biome check` does lint+format combined)

## Resolution

root_cause: `bun run format:check` (= `biome check src tests packages`) exits 1 with 599 errors: 231 `format` diagnostics + 368 `assist/source/organizeImports` diagnostics. `bun run lint` passes (exit 0, only warnings). Failure is pure formatting/import-order drift — both categories are safe-auto-fixable.
fix: (diagnose-only mode — see recommendation in report)
verification:
files_changed: []
