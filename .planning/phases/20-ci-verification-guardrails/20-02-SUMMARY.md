---
phase: 20-ci-verification-guardrails
plan: 02
subsystem: infra
tags: [github-actions, playwright, bun, postgres, commitlint]

requires:
  - phase: 20-ci-verification-guardrails
    provides: Guardrail scripts, bunfig, commitlint, smoke tags, routes runner contract (Plan 20-01)
provides:
  - Eight parallel CI jobs on push/PR to main and develop
  - Branch protection runbook with gh api examples
affects: [ci, onboarding]

tech-stack:
  added: []
  patterns:
    - "Per-job checkout + setup-bun + actions/cache + install (no reusable workflow)"
    - "routes-check starts app on PORT=3001 and runs copied Feature test with API_BASE_URL"

key-files:
  created:
    - docs/ci/branch-protection-setup.md
  modified:
    - .github/workflows/ci.yml

key-decisions:
  - "routes-check uses background server + temp copy of tests/Feature because routes-existence needs API_BASE_URL (deviation from plan snippet that used bare bun test path only)."

patterns-established:
  - "Postgres service only on migration-drift and e2e-smoke; ORM=memory elsewhere where applicable."

requirements-completed: [CI-01, CI-02, CI-03, CI-04, CI-05, CI-06, CI-07, CI-08]

duration: "-"
completed: 2026-04-13
---

# Phase 20 Plan 02 Summary

**GitHub Actions CI split into eight parallel jobs (cache + Postgres where needed) and a Traditional Chinese branch-protection runbook with matching required-check names.**

## Performance

- **Duration:** Not timed end-to-end (checkpoint verified via live PR run).
- **Tasks:** 3 (Task 1–2 implementation; Task 3 human checkpoint — see below)
- **Files modified:** 2 primary (`.github/workflows/ci.yml`, `docs/ci/branch-protection-setup.md`)

## Accomplishments

- Replaced the single `check` job with eight kebab-case jobs: `typecheck`, `lint-format`, `unit-coverage`, `migration-drift`, `routes-check`, `di-audit`, `e2e-smoke`, `commitlint`.
- Applied `actions/cache@v4` on `~/.bun/install/cache` and `node_modules` with `hashFiles('bun.lock', 'bun.lockb')` on every job.
- `migration-drift` and `e2e-smoke` share the `postgres:16` service pattern from the plan.
- `commitlint` runs only on `pull_request` with `fetch-depth: 0` and base/head SHAs.
- Delivered `docs/ci/branch-protection-setup.md` (≥40 lines, Traditional Chinese, eight contexts, dummy PR flow, `gh api` PUT/DELETE examples).

## Task Commits

1. **Task 1: CI workflow** — `a583918` (feat(phase20): enforce CI guardrails with repo-owned runners) — includes eight jobs and routes-check server wrapper.
2. **Task 2: Runbook** — same commit as Task 1 (runbook added in same delivery wave).
3. **Task 3: GitHub Actions checkpoint** — verified via open PR **#4** (`phase20-ci-guardrails-final`); Actions run `24328101209` (`https://github.com/CarlLee1983/draupnir/actions/runs/24328101209`). All eight job names appeared and started in parallel (same-minute `startedAt` on completed jobs). **Awaiting maintainer explicit `approved` in GSD if you want the checkpoint closed in tooling.**

## Files Created/Modified

- `.github/workflows/ci.yml` — Eight parallel jobs, caches, Postgres services, Playwright chromium install, coverage artifact upload, PR-scoped commitlint.
- `docs/ci/branch-protection-setup.md` — Admin runbook for required checks on `main` / `develop`.

## Deviations from Plan

### routes-check implementation

- **Plan snippet:** `bun test tests/Feature/routes-existence.e2e.ts` with env only.
- **Actual:** Starts `bun run src/index.ts` on `PORT=3001`, copies `tests/Feature` to a temp dir, runs `bun test ./Feature/routes-existence.e2e.ts` with `API_BASE_URL=http://127.0.0.1:3001` (required because the harness expects a live API; see Plan 20-01 summary — bare `bun test` without server fails).

## GitHub Actions evidence (PR #4)

- **PR:** https://github.com/CarlLee1983/draupnir/pull/4  
- **Sample run:** https://github.com/CarlLee1983/draupnir/actions/runs/24328101209  
- **Jobs observed:** `typecheck`, `lint-format`, `unit-coverage`, `migration-drift`, `routes-check`, `di-audit`, `e2e-smoke`, `commitlint` — all scheduled; parallel start timestamps within ~1s for the fast jobs.

### Known failures (pre-existing / branch content, not CI wiring)

Per Plan 20-02 Task 3 guidance, these are recorded as **known-failures** (not fixed in this phase):

| Job | Likely cause |
|-----|----------------|
| `unit-coverage` | Plan 20-01 noted unrelated failing tests / coverage gate still red on full suite. |
| `lint-format` | `format:check` failed on branch (Biome format drift). |
| `commitlint` | One or more commits in the PR range do not satisfy conventional-commit rules. |

Re-run `gh pr checks 4` after pushes to see latest conclusions for `migration-drift` and `e2e-smoke` (long-running).

### Cache timing

- Not captured as before/after wall-clock in CI logs for this execution; recommend comparing `bun install` step duration between first push and a no-deps second push on the same branch.

## Branch protection

- **Status:** Not applied via automation (per D-21). Repo admin should follow `docs/ci/branch-protection-setup.md` when ready.

## Next Phase Readiness

- After jobs are green (or policy accepts known-failures as out-of-scope), runbook can be applied so merges require all eight contexts.
- Origin default branch note in STATE (master vs main/develop) may affect which branch PRs target; workflow already listens for `main` and `develop`.

---
*Phase: 20-ci-verification-guardrails · Plan: 02*
