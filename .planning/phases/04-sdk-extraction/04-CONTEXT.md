# Phase 4: SDK Extraction - Context

**Gathered:** 2026-04-10
**Status:** Ready for research

<domain>
## Phase Boundary

Phase 4 extracts the concrete `BifrostClient` implementation into a standalone Bun workspace package at `packages/bifrost-sdk/`.
After this phase, Draupnir no longer reads `BifrostClient` from `src/Foundation/Infrastructure/Services/BifrostClient/`, and all imports use the workspace package instead.

**In scope:**
- Create `packages/bifrost-sdk/` with its own `package.json`, `tsconfig.json`, `README.md`, source files, and smoke test
- Move `BifrostClient`, `BifrostClientConfig`, `types`, `errors`, and `retry` into the package
- Update the root workspace configuration and all imports to use `@draupnir/bifrost-sdk` via `workspace:*`
- Update `FoundationServiceProvider` and `BifrostGatewayAdapter` to import the SDK package
- Move the hardcoded Bifrost proxy URL out of `SdkApiServiceProvider` and into the SDK package config surface
- Delete `src/Foundation/Infrastructure/Services/BifrostClient/` once the package migration is complete and verified

**Explicitly NOT in scope:**
- Re-abstracting `ProxyModelCall` behind `ILLMGatewayClient`
- Adding OpenRouter, Gemini, or any second gateway adapter
- Runtime gateway switching via env vars or factory selection
- Renaming the existing `BIFROST_*` environment variables across the whole app
- Publishing the package to an external registry

</domain>

<decisions>
## Implementation Decisions

### D-P04-01: Package name and scope

- **Decision:** The workspace package is named `@draupnir/bifrost-sdk` unless a repo-wide naming conflict appears during implementation.
- **Why:** It matches the current repository namespace and keeps imports stable and obvious during the migration.
- **Scope:** Root `package.json`, the package-local `package.json`, and all import sites that switch to the workspace package.

### D-P04-02: Workspace-only distribution

- **Decision:** The SDK is consumed only through Bun workspaces using `workspace:*`.
- **Why:** This milestone is about extracting the codebase boundary, not publishing cadence.
- **Scope:** No external registry publication in this milestone.

### D-P04-03: Source move is a real move, not a parallel copy

- **Decision:** The following files move into `packages/bifrost-sdk/src/` and become package-local implementation details:
  - `BifrostClient.ts`
  - `BifrostClientConfig.ts`
  - `types.ts`
  - `errors.ts`
  - `retry.ts`
  - `index.ts`
- **Why:** The phase goal explicitly requires the old `src/Foundation/Infrastructure/Services/BifrostClient/` directory to disappear after verification.
- **Scope:** The package should re-export its public API from its own `index.ts`.

### D-P04-04: SDK owns proxy URL sourcing

- **Decision:** The hardcoded proxy base URL currently embedded in `SdkApiServiceProvider` moves into the SDK package config surface, e.g. `BifrostClientConfig.proxyBaseUrl`.
- **Why:** Proxy endpoint sourcing belongs with the gateway SDK, not the application provider.
- **Scope:** `ProxyModelCall` stays functionally unchanged; only where its base URL comes from changes.

### D-P04-05: Foundation wiring switches to the package import

- **Decision:** `FoundationServiceProvider` will import `BifrostClient` and `createBifrostClientConfig` from `@draupnir/bifrost-sdk` once the package exists.
- **Why:** This keeps the existing singleton wiring pattern intact while removing the old in-repo source path.
- **Scope:** `llmGatewayClient` keeps depending on the gateway client through the adapter.

### D-P04-06: `ProxyModelCall` remains out of scope for the abstraction

- **Decision:** `ProxyModelCall` continues to call the gateway directly and does not become part of `ILLMGatewayClient`.
- **Why:** The abstraction is for key lifecycle and usage reporting, not raw chat-completion forwarding.
- **Scope:** Only its URL/config dependency moves into the SDK package.

### D-P04-07: Smoke test required inside the package

- **Decision:** `packages/bifrost-sdk/` needs at least one self-contained smoke test that runs without importing anything from `src/`.
- **Why:** The package must prove it is independently buildable and usable.
- **Scope:** Test should validate the package in isolation, not rely on Draupnir application code.

### D-P04-08: Preserve coexistence until the package is verified

- **Decision:** The old source tree stays available until the new package, import rewrites, and smoke test are all verified.
- **Why:** This avoids a broken intermediate state during the move.
- **Scope:** Delete the old directory only after the package path is fully wired.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 4 scope and rationale
- `docs/superpowers/specs/2026-04-10-llm-gateway-abstraction-design.md` - Original design source; use as background, but follow the milestone decisions in this context and the project docs if they differ
- `.planning/PROJECT.md` - Core value, out-of-scope list, and package-level direction
- `.planning/ROADMAP.md` - Phase 4 goal, success criteria, and dependency ordering
- `.planning/REQUIREMENTS.md` - SDK-01 through SDK-06, TEST-02/04, QUAL-01 through QUAL-05

### Existing code to move or update
- `src/Foundation/Infrastructure/Services/BifrostClient/BifrostClient.ts` - Concrete client to extract
- `src/Foundation/Infrastructure/Services/BifrostClient/BifrostClientConfig.ts` - Config surface to move into the package
- `src/Foundation/Infrastructure/Services/BifrostClient/types.ts` - Bifrost wire types to move into the package
- `src/Foundation/Infrastructure/Services/BifrostClient/errors.ts` - Error classes to move into the package
- `src/Foundation/Infrastructure/Services/BifrostClient/retry.ts` - Retry logic to move into the package
- `src/Foundation/Infrastructure/Services/BifrostClient/index.ts` - Public barrel to move into the package
- `src/Foundation/Infrastructure/Providers/FoundationServiceProvider.ts` - Singleton wiring updates
- `src/Foundation/Infrastructure/Services/LLMGateway/implementations/BifrostGatewayAdapter.ts` - Adapter import path update
- `src/Foundation/index.ts` - Public re-export surface that still points at the in-repo Bifrost client
- `src/Modules/SdkApi/Infrastructure/Providers/SdkApiServiceProvider.ts` - Proxy URL source of truth currently hardcoded here
- `src/Modules/SdkApi/Application/UseCases/ProxyModelCall.ts` - Must remain functionally unchanged

### Tests and verification surfaces
- `tests/Unit/Foundation/BifrostClient/BifrostClient.test.ts` - Existing client tests that will need to follow the package move
- `tests/Unit/Foundation/BifrostClient/errors.test.ts` - Error tests for the extracted package
- `tests/Unit/Foundation/BifrostClient/retry.test.ts` - Retry tests for the extracted package
- `tests/Unit/Foundation/BifrostClient/types.test.ts` - Type surface tests for the extracted package
- `tests/Unit/Foundation/LLMGateway/BifrostGatewayAdapter.test.ts` - Adapter tests that will need the new package import path
- `tests/Feature/routes-connectivity.e2e.ts` - Route-level smoke check in the final verification phase
- `tests/Feature/routes-existence.e2e.ts` - Route existence smoke check in the final verification phase

### Project-level constraints
- `.planning/codebase/CONCERNS.md` - Coupling and configuration risks being resolved by this phase
- `.planning/codebase/STACK.md` - Bun, TypeScript, and workspace assumptions
- `.planning/codebase/INTEGRATIONS.md` - Current Bifrost API surface and config notes
- `.planning/codebase/STRUCTURE.md` - `src/Foundation/` and `src/Modules/` layout assumptions
- `.planning/codebase/TESTING.md` - Test layout and packaging conventions

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`FoundationServiceProvider` singleton pattern** - The current `bifrostClient` and `llmGatewayClient` registrations show exactly where the package import needs to land.
- **`BifrostGatewayAdapter`** - Already separates gateway-neutral code from Bifrost wire types; only its import source needs to change.
- **Existing Bifrost test suite** - The unit tests under `tests/Unit/Foundation/BifrostClient/` already provide a ready-made acceptance bar for the extracted package.

### Established Patterns
- **Barrel exports** - The repo already uses `index.ts` barrels for service directories, so the package should do the same.
- **Path alias imports** - `@/` is the dominant internal import pattern; the package move must not leave mixed old-path and workspace imports behind.
- **Strict Bun + TypeScript setup** - `bun.lock` exists and the project does not currently declare workspaces in `package.json`, so the root manifest change is a real migration point.

### Integration Points
- `src/Foundation/Infrastructure/Providers/FoundationServiceProvider.ts` still constructs the gateway client from the in-repo files.
- `src/Modules/SdkApi/Infrastructure/Providers/SdkApiServiceProvider.ts` still reads `process.env.BIFROST_API_URL` directly for `ProxyModelCall`.
- `src/Foundation/index.ts` still re-exports `BifrostClient` and `createBifrostClientConfig` from the old path.
- `src/Foundation/Infrastructure/Services/LLMGateway/implementations/BifrostGatewayAdapter.ts` still imports the concrete client from the old path.

### Constraints Observed
- **No workspace package yet** - `package.json` currently has no `workspaces` field.
- **Old client still lives under `src/Foundation/Infrastructure/Services/BifrostClient/`** - the phase goal requires removing that directory after migration.
- **ProxyModelCall remains direct** - the abstraction boundary stops short of the chat-completions proxy path.

</code_context>

<specifics>
## Specific Ideas

- Use `@draupnir/bifrost-sdk` as the workspace package scope unless a naming conflict is discovered.
- Keep the package self-contained so its smoke test can run without importing anything from `src/`.
- Move the proxy base URL lookup into the SDK package, not into `SdkApiServiceProvider`.
- Preserve the current `ProxyModelCall` behavior and request semantics.
- Delete the old `src/Foundation/Infrastructure/Services/BifrostClient/` directory only after the workspace import path is verified everywhere.

</specifics>

<deferred>
## Deferred Ideas

- **OpenRouter / Gemini adapters** - New gateway backends belong in a later milestone after the SDK boundary is stable.
- **Runtime gateway switching** - Keep the compile-time ServiceProvider decision model for now.
- **External package publishing** - Workspace-only is enough for this milestone.
- **Renaming `BIFROST_*` env vars repo-wide** - Centralize config in the SDK package first; broader environment renaming can be a separate follow-up.
- **Abstracting `ProxyModelCall` behind `ILLMGatewayClient`** - Still explicitly out of scope.

</deferred>

---

*Phase: 04-sdk-extraction*
*Context gathered: 2026-04-10*
