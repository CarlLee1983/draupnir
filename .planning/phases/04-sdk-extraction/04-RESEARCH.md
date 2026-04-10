# Phase 4: SDK Extraction - Research

**Researched:** 2026-04-10
**Domain:** Bun workspaces, TypeScript monorepo package extraction, workspace dependency resolution
**Confidence:** HIGH

## Summary

Phase 4 extracts the existing `BifrostClient` implementation from `src/Foundation/Infrastructure/Services/BifrostClient/` into a standalone Bun workspace package at `packages/bifrost-sdk/`. This is a **move-and-rewire** operation, not new feature development. The source files already exist and are well-tested; the challenge is configuring Bun workspaces correctly, updating all import paths, and ensuring the package is self-contained.

Bun natively supports npm-style workspaces via the `workspaces` field in root `package.json`. The `workspace:*` protocol enables local package resolution without publishing. The main technical risk is TypeScript path alias resolution in workspace packages -- Bun resolves `tsconfig.json` paths relative to the **execution root**, so the SDK package must use relative imports internally (no `@/` alias) and must not depend on the root project's path aliases.

**Primary recommendation:** Move the 6 source files into `packages/bifrost-sdk/src/`, create a minimal `package.json` + `tsconfig.json` for the package, add `"workspaces": ["packages/*"]` to root `package.json`, then rewire all imports in `src/` and `tests/` to use `@draupnir/bifrost-sdk`. Delete the old directory only after full test suite passes.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-P04-01: Package name is `@draupnir/bifrost-sdk`
- D-P04-02: Workspace-only distribution via `workspace:*` -- no external registry
- D-P04-03: Source move is a real move, not a parallel copy. Files: BifrostClient.ts, BifrostClientConfig.ts, types.ts, errors.ts, retry.ts, index.ts
- D-P04-04: SDK owns proxy URL sourcing -- hardcoded proxy base URL moves from `SdkApiServiceProvider` into `BifrostClientConfig.proxyBaseUrl`
- D-P04-05: `FoundationServiceProvider` imports from `@draupnir/bifrost-sdk` once the package exists
- D-P04-06: `ProxyModelCall` remains out of scope for the abstraction; only its URL/config dependency moves
- D-P04-07: Smoke test required inside the package -- self-contained, no `src/` imports
- D-P04-08: Preserve coexistence until the package is verified; delete old directory last

### Claude's Discretion
- Internal package structure (file layout within `packages/bifrost-sdk/`)
- tsconfig.json configuration for the package
- Smoke test strategy and what to test
- Order of import rewiring across modules

### Deferred Ideas (OUT OF SCOPE)
- OpenRouter / Gemini adapters
- Runtime gateway switching
- External package publishing
- Renaming `BIFROST_*` env vars repo-wide
- Abstracting `ProxyModelCall` behind `ILLMGatewayClient`
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SDK-01 | `packages/bifrost-sdk/` exists as a Bun workspace package with own `package.json`, `tsconfig.json`, `README.md` | Bun workspace setup pattern documented; package.json template provided |
| SDK-02 | Source files moved from `src/Foundation/.../BifrostClient/` into `packages/bifrost-sdk/src/` with barrel re-export | File inventory complete (6 files); internal import rewrite pattern documented |
| SDK-03 | Root `package.json` declares `packages/*` workspaces; imports use `@draupnir/bifrost-sdk` via `workspace:*` | Bun workspace:* protocol verified; root package.json modification pattern documented |
| SDK-04 | Old `src/Foundation/.../BifrostClient/` directory deleted with no dangling imports | Full import graph mapped (12 consuming files in src/ + tests/); grep verification command documented |
| SDK-05 | Hardcoded Bifrost proxy URL moves into SDK config surface; `ProxyModelCall` works unchanged | `SdkApiServiceProvider` proxy URL source identified; `BifrostClientConfig.proxyBaseUrl` extension pattern documented |
| SDK-06 | Self-contained smoke test in `packages/bifrost-sdk/` with no Draupnir `src/` imports | Smoke test strategy documented; bun:test compatible pattern provided |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| bun | 1.3.10 | Runtime, package manager, test runner | Already project runtime; native workspace support |
| typescript | 5.3.0 | Type checking for SDK package | Already project standard |
| biome | 2.4.11 | Lint/format for SDK package | Already project standard |

### Supporting
No new dependencies needed. The SDK package uses only `fetch` (Bun built-in) and standard TypeScript.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Bun workspaces | npm workspaces | Bun already runs the project; npm workspaces would add a parallel package manager |
| `workspace:*` | File-relative (`file:../packages/bifrost-sdk`) | `workspace:*` is the standard Bun monorepo protocol; file: is legacy |
| Relative imports in SDK | Path aliases in SDK | Path aliases in workspace packages have known Bun resolution issues (GitHub #12262); relative imports are reliable |

## Architecture Patterns

### Recommended Package Structure
```
packages/
  bifrost-sdk/
    package.json          # name: @draupnir/bifrost-sdk
    tsconfig.json         # strict, relative paths only
    README.md             # minimal usage docs
    src/
      index.ts            # barrel re-export (public API)
      BifrostClient.ts    # moved from src/Foundation/...
      BifrostClientConfig.ts  # extended with proxyBaseUrl
      types.ts            # Bifrost wire types
      errors.ts           # BifrostApiError
      retry.ts            # withRetry utility
    __tests__/
      smoke.test.ts       # self-contained smoke test
```

### Pattern 1: Bun Workspace Package
**What:** Declare `packages/*` in root `package.json`, create a standalone package with its own `package.json` and `tsconfig.json`.
**When to use:** When extracting a self-contained module that should be independently testable.
**Example:**

Root `package.json` addition:
```json
{
  "workspaces": ["packages/*"]
}
```

Package `packages/bifrost-sdk/package.json`:
```json
{
  "name": "@draupnir/bifrost-sdk",
  "version": "0.1.0",
  "type": "module",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "test": "bun test __tests__/",
    "typecheck": "tsc --noEmit",
    "build": "bun build src/index.ts --outdir dist --format esm --target bun"
  },
  "devDependencies": {
    "@types/bun": "^1.3.10",
    "typescript": "^5.3.0"
  }
}
```

**Key insight:** Because Bun resolves TypeScript source directly (no pre-build step needed for workspace consumption), setting `"main": "src/index.ts"` lets the root project import TS source directly from the workspace package. The `build` script is for independent verification (SDK-01 success criterion) but is **not** required for day-to-day development.

### Pattern 2: proxyBaseUrl Config Extension
**What:** Add an optional `proxyBaseUrl` field to `BifrostClientConfig`, sourced from `BIFROST_API_URL` in `createBifrostClientConfig`.
**When to use:** SDK-05 requires the proxy URL to move into the SDK's config surface.
**Example:**

```typescript
export interface BifrostClientConfig {
  readonly baseUrl: string
  readonly masterKey: string
  readonly timeoutMs: number
  readonly maxRetries: number
  readonly retryBaseDelayMs: number
  readonly proxyBaseUrl: string  // NEW: derived from baseUrl, used by ProxyModelCall
}

export function createBifrostClientConfig(
  overrides?: Partial<BifrostClientConfig>,
): BifrostClientConfig {
  const baseUrl = overrides?.baseUrl ?? process.env.BIFROST_API_URL
  // ... existing validation ...
  const cleanBaseUrl = baseUrl.replace(/\/+$/, '')
  return {
    baseUrl: cleanBaseUrl,
    masterKey,
    timeoutMs: overrides?.timeoutMs ?? 30_000,
    maxRetries: overrides?.maxRetries ?? 3,
    retryBaseDelayMs: overrides?.retryBaseDelayMs ?? 500,
    proxyBaseUrl: overrides?.proxyBaseUrl ?? cleanBaseUrl,  // defaults to baseUrl
  }
}
```

Then `SdkApiServiceProvider` changes from:
```typescript
const bifrostBaseUrl = (process.env.BIFROST_API_URL ?? 'http://localhost:8787').replace(/\/+$/, '')
return new ProxyModelCall(bifrostBaseUrl)
```
To:
```typescript
const config = c.make('bifrostConfig') as BifrostClientConfig
return new ProxyModelCall(config.proxyBaseUrl)
```

### Pattern 3: Import Rewiring Strategy
**What:** Replace all `@/Foundation/Infrastructure/Services/BifrostClient/*` imports with `@draupnir/bifrost-sdk`.
**When to use:** After the SDK package is set up and `bun install` resolves the workspace link.

**Files requiring import changes (complete list):**

Source files (4):
1. `src/Foundation/Infrastructure/Providers/FoundationServiceProvider.ts` -- imports BifrostClient, createBifrostClientConfig
2. `src/Foundation/Infrastructure/Services/LLMGateway/implementations/BifrostGatewayAdapter.ts` -- imports BifrostClient, isBifrostApiError
3. `src/Foundation/index.ts` -- re-exports BifrostClient symbols
4. `src/Modules/CliApi/Infrastructure/Providers/CliApiServiceProvider.ts` -- imports BifrostClient type

Test files (5):
1. `tests/Unit/Foundation/BifrostClient/BifrostClient.test.ts`
2. `tests/Unit/Foundation/BifrostClient/errors.test.ts`
3. `tests/Unit/Foundation/BifrostClient/retry.test.ts`
4. `tests/Unit/Foundation/BifrostClient/types.test.ts`
5. `tests/Unit/Foundation/LLMGateway/BifrostGatewayAdapter.test.ts`

### Anti-Patterns to Avoid
- **Using `@/` path alias inside the SDK package:** Bun resolves `@/` from the root tsconfig, not the package-local one. The SDK must use relative imports (e.g., `./errors`, `./types`). Verified: Bun has a known open issue (#12262) where package-local tsconfig paths are not respected.
- **Circular dependency between SDK and src/:** The SDK package must never import from `@/*` or any Draupnir application code. It is a leaf dependency.
- **Deleting old directory before verification:** D-P04-08 explicitly requires coexistence until verified. Delete only as the final step.
- **Adding `@draupnir/bifrost-sdk` to root `dependencies`:** This belongs in root `devDependencies` (or no explicit dependency at all, since workspaces auto-link). The consuming code imports it by package name; Bun resolves it via the workspace link.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Workspace linking | Symlinks or custom scripts | Bun native `workspaces` + `workspace:*` | Bun handles node_modules linking automatically after `bun install` |
| Package build | Custom bundler config | `bun build src/index.ts --outdir dist --format esm --target bun` | Standard Bun build command; no webpack/rollup needed |
| Import path updates | Manual find-and-replace | Structured file-by-file rewiring with grep verification | 9 files total; manual replacement is error-prone |

## Common Pitfalls

### Pitfall 1: Forgetting `bun install` After Adding Workspaces
**What goes wrong:** After adding `"workspaces": ["packages/*"]` to root `package.json`, imports of `@draupnir/bifrost-sdk` fail with "module not found".
**Why it happens:** Bun needs to re-resolve the workspace graph and create the symlink in `node_modules/@draupnir/bifrost-sdk`.
**How to avoid:** Run `bun install` immediately after modifying the root `package.json` workspaces field.
**Warning signs:** "Cannot find module '@draupnir/bifrost-sdk'" errors.

### Pitfall 2: Path Alias in Workspace Package
**What goes wrong:** Using `@/` imports inside `packages/bifrost-sdk/src/` causes resolution failures.
**Why it happens:** Bun resolves tsconfig paths from the root project context, not the package-local tsconfig. Open issue: oven-sh/bun#12262.
**How to avoid:** Use only relative imports (`./errors`, `./types`) inside the SDK package source files. The existing code already uses relative imports, so this is a matter of not introducing aliases during the move.
**Warning signs:** "Unknown module" errors when running SDK tests in isolation.

### Pitfall 3: Root tsconfig `include` Not Covering packages/
**What goes wrong:** `bun run typecheck` (which runs `tsc --noEmit`) does not check the SDK package.
**Why it happens:** Root `tsconfig.json` currently includes only `["src", "tests", "config", "types", "database"]`. The new `packages/` directory is not covered.
**How to avoid:** Either (a) add `"packages"` to the root tsconfig `include`, or (b) run a separate `tsc --noEmit` inside the SDK package. Option (a) is simpler; option (b) is cleaner separation. Recommendation: add `"packages"` to root `include` AND give the SDK its own tsconfig for isolated builds.
**Warning signs:** Type errors in the SDK go undetected by root typecheck.

### Pitfall 4: Lint/Format Not Covering packages/
**What goes wrong:** `bun run lint` runs `biome lint src tests` -- the SDK package is excluded.
**Why it happens:** Biome CLI arguments explicitly list `src tests`, not `packages`.
**How to avoid:** Update lint and format scripts to include `packages`: `biome lint src tests packages`.
**Warning signs:** Biome violations in SDK code go undetected.

### Pitfall 5: Test Command Not Covering SDK Package Tests
**What goes wrong:** `bun test src tests` does not run tests inside `packages/bifrost-sdk/__tests__/`.
**Why it happens:** Bun test path arguments are explicit.
**How to avoid:** Either (a) add `packages` to the root test command, or (b) keep SDK tests separate with `bun test` inside the package. Recommendation: add a root-level `test:sdk` script AND include `packages` in the main test command.
**Warning signs:** SDK smoke test never runs in CI.

### Pitfall 6: CliApiServiceProvider Still Imports BifrostClient
**What goes wrong:** After the main rewiring, `CliApiServiceProvider` still has `import type { BifrostClient } from '@/Foundation/Infrastructure/Services/BifrostClient/BifrostClient'`.
**Why it happens:** This file was not part of Phase 2/3 migration since it uses `BifrostClient as any` for the CLI proxy. Easy to miss.
**How to avoid:** Include it in the import rewiring sweep. It should import from `@draupnir/bifrost-sdk` instead.
**Warning signs:** grep for old import path returns non-zero matches.

## Code Examples

### SDK Package tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "esnext",
    "moduleResolution": "bundler",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "rootDir": ".",
    "outDir": "dist"
  },
  "include": ["src", "__tests__"],
  "exclude": ["node_modules", "dist"]
}
```

### Smoke Test Example (SDK-06)
```typescript
// packages/bifrost-sdk/__tests__/smoke.test.ts
import { describe, it, expect } from 'bun:test'
import {
  BifrostClient,
  createBifrostClientConfig,
  BifrostApiError,
  isBifrostApiError,
  withRetry,
} from '../src'
import type { BifrostClientConfig } from '../src'

describe('@draupnir/bifrost-sdk smoke', () => {
  it('exports BifrostClient constructor', () => {
    expect(BifrostClient).toBeDefined()
    expect(typeof BifrostClient).toBe('function')
  })

  it('createBifrostClientConfig returns valid config', () => {
    const config = createBifrostClientConfig({
      baseUrl: 'https://test.example.com',
      masterKey: 'test-key',
    })
    expect(config.baseUrl).toBe('https://test.example.com')
    expect(config.masterKey).toBe('test-key')
    expect(config.proxyBaseUrl).toBe('https://test.example.com')
    expect(config.timeoutMs).toBe(30_000)
  })

  it('BifrostApiError is constructable', () => {
    const error = new BifrostApiError(500, '/test', 'server error')
    expect(error.status).toBe(500)
    expect(error.isRetryable).toBe(true)
    expect(isBifrostApiError(error)).toBe(true)
  })

  it('withRetry is callable', () => {
    expect(typeof withRetry).toBe('function')
  })
})
```

### Import Rewiring: Before/After

**FoundationServiceProvider (before):**
```typescript
import { BifrostClient } from '../Services/BifrostClient/BifrostClient'
import { createBifrostClientConfig } from '../Services/BifrostClient/BifrostClientConfig'
```

**FoundationServiceProvider (after):**
```typescript
import { BifrostClient, createBifrostClientConfig } from '@draupnir/bifrost-sdk'
```

**BifrostGatewayAdapter (before):**
```typescript
import { isBifrostApiError } from '../../BifrostClient/errors'
import type { BifrostClient } from '../../BifrostClient/BifrostClient'
```

**BifrostGatewayAdapter (after):**
```typescript
import { isBifrostApiError, type BifrostClient } from '@draupnir/bifrost-sdk'
```

### Verification Grep Commands
```bash
# Must return zero matches after SDK-04 is complete
grep -r "Services/BifrostClient" src/

# Must return zero matches in src/ (excluding SDK package itself)
grep -r "from.*BifrostClient/" src/ --include='*.ts'

# Must return zero matches in tests/ referencing old path
grep -r "@/Foundation/Infrastructure/Services/BifrostClient" tests/ --include='*.ts'
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `file:` relative links for monorepo packages | `workspace:*` protocol in Bun/npm/pnpm | Bun 1.0+ (2023) | Cleaner resolution, publishing-ready |
| Pre-build workspace packages to dist/ | Bun resolves .ts source directly | Bun 1.0+ (2023) | No build step needed for workspace consumption |

## Open Questions

1. **Root `devDependencies` entry for SDK**
   - What we know: Bun auto-links workspace packages without an explicit dependency entry
   - What's unclear: Whether an explicit `"@draupnir/bifrost-sdk": "workspace:*"` in root `package.json` is needed for `bun test` to resolve it
   - Recommendation: Add it to root `devDependencies` to be explicit; `bun install` will symlink it regardless

2. **CliApiServiceProvider's `bifrostClient as any` cast**
   - What we know: `CliApiServiceProvider` imports `BifrostClient` type but casts to `any` when passing to `ProxyCliRequestService`. The service accepts `ICliProxyClient` interface, not `BifrostClient`.
   - What's unclear: Whether this import should switch to `@draupnir/bifrost-sdk` or be removed entirely (since the type is cast away)
   - Recommendation: Switch the import to `@draupnir/bifrost-sdk` for consistency. The `as any` cast is a separate code smell but out of scope for this phase.

3. **`src/Foundation/index.ts` barrel re-exports**
   - What we know: It currently re-exports BifrostClient symbols from the old path
   - What's unclear: Whether it should re-export from the SDK package or stop exporting Bifrost symbols entirely
   - Recommendation: Re-export from `@draupnir/bifrost-sdk` to maintain the existing public API surface of `src/Foundation/`. Consumers outside Foundation can use either path.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Bun test (built-in) |
| Config file | none (Bun test auto-discovers) |
| Quick run command | `bun test packages/bifrost-sdk/` |
| Full suite command | `bun test src tests packages` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SDK-01 | Package builds independently | smoke | `cd packages/bifrost-sdk && bun run build` | Wave 0 |
| SDK-02 | Source files moved, barrel exports work | unit | `bun test packages/bifrost-sdk/__tests__/smoke.test.ts` | Wave 0 |
| SDK-03 | Workspace resolution works | integration | `bun test tests/Unit/Foundation/BifrostClient/` | Exists (needs import update) |
| SDK-04 | No dangling imports | grep | `grep -r "Services/BifrostClient" src/` | N/A (command, not test) |
| SDK-05 | Proxy URL from SDK config | unit | `bun test packages/bifrost-sdk/__tests__/smoke.test.ts` | Wave 0 |
| SDK-06 | Self-contained smoke test | smoke | `bun test packages/bifrost-sdk/__tests__/` | Wave 0 |

### Sampling Rate
- **Per task commit:** `bun test packages/bifrost-sdk/ && bun test src tests`
- **Per wave merge:** `bun test src tests packages && bun run typecheck`
- **Phase gate:** Full suite green + grep verification before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `packages/bifrost-sdk/__tests__/smoke.test.ts` -- covers SDK-01, SDK-02, SDK-05, SDK-06
- [ ] `packages/bifrost-sdk/package.json` -- package manifest
- [ ] `packages/bifrost-sdk/tsconfig.json` -- type checking config

## Project Constraints (from CLAUDE.md)

- **Language:** Commit messages, docs in Traditional Chinese (Taiwan). Code and identifiers in English.
- **Commit format:** `<type>: [ <scope> ] <subject>`
- **Immutability:** New types use `readonly` fields. No mutation.
- **TypeScript strict:** `strict: true`, `noImplicitAny`, all strict checks enabled.
- **Biome:** Lint and format with Biome 2.4.11. Single quotes, 2-space indent, 100-char line width.
- **No DB migration:** Column names stay as-is.
- **Gateway decided at wire time:** ServiceProvider binds once. No env-var factory.
- **Test baseline:** Full Bun test suite must pass at every phase boundary.
- **GSD Workflow:** Use GSD commands for all repo changes.

## Sources

### Primary (HIGH confidence)
- [Bun Workspaces Documentation](https://bun.com/docs/pm/workspaces) - workspace:* protocol, package.json setup
- [Bun tsconfig paths](https://bun.sh/guides/runtime/tsconfig-paths) - path alias resolution mechanics
- Project source code inspection - all 12 consuming files identified via grep

### Secondary (MEDIUM confidence)
- [Bun workspace tsconfig issue #12262](https://github.com/oven-sh/bun/issues/12262) - confirms package-local tsconfig paths are NOT resolved by Bun; relative imports required in workspace packages

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new dependencies; Bun workspaces well-documented
- Architecture: HIGH - straightforward file move + import rewiring; all files inventoried
- Pitfalls: HIGH - verified against Bun's known issues; tsconfig path limitation confirmed via GitHub issue

**Research date:** 2026-04-10
**Valid until:** 2026-05-10 (stable domain; Bun workspace API unlikely to change)
