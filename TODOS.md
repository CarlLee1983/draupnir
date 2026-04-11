# TODOS

## CliApi

### Device Flow E2E Test Server Bootstrap

- **Issue:** `src/Modules/CliApi/__tests__/DeviceFlowE2E.test.ts` (9 test failures)
- **Root Cause:** E2E tests require a running dev server on `localhost:3000` for HTTP requests. Currently failing with "undefined is not an object (evaluating 'response.ok')" because fetch returns undefined when no server is available.
- **Tests Affected:** Happy Path, Authorization States, Error Handling, Session Revocation, CLI Polling Behavior (all 9 test cases in DeviceFlowE2E.test.ts)
- **Why Pre-existing:** Not caused by page routes refactor. These tests depend on external dev server infrastructure, unrelated to `src/Pages/page-routes.ts` changes.
- **Fix Required:** Set up test server initialization in `beforeAll()` hook, or mock the server responses properly. Likely needs `http-test-server` or similar testing server.
- **Priority:** P0
- **Detected:** feat/page-routes-refactor branch test run (2026-04-11)

## Credit

### Mock Gateway Rate Limit Simulation

- **Issue:** `src/Modules/Credit/__tests__/HandleBalanceDepletedService.test.ts` (1 failure)
- **Root Cause:** Mock gateway client returns rate limit error (key-1 temporary error, will be retried). This is intentional test behavior for testing retry logic, but the test expectations don't handle the transient failure gracefully.
- **Tests Affected:** `應成功阻擋所有 active keys` test
- **Why Pre-existing:** Not caused by page routes refactor. This is flaky test infrastructure that simulates API rate limiting. Changes to page-routes.ts don't affect LLM gateway behavior.
- **Fix Required:** Update test to properly mock rate limit scenarios or increase retry tolerance.
- **Priority:** P0
- **Detected:** feat/page-routes-refactor branch test run (2026-04-11)

### Mock LLM Gateway Error Path

- **Issue:** `src/Modules/Credit/__tests__/HandleCreditToppedUpService.test.ts` (1 failure)
- **Root Cause:** Mock LLM Gateway throws intentional error for testing error paths. Test mock returns `GatewayError('Gateway error', 'NETWORK', 503, true)` as expected behavior.
- **Tests Affected:** Test error handling path for gateway failures
- **Why Pre-existing:** Not caused by page routes refactor. This tests error handling for LLM integration. Page route consolidation doesn't affect credit module or LLM gateway behavior.
- **Fix Required:** Verify mock is set up correctly for error simulation. May need better error context setup.
- **Priority:** P0
- **Detected:** feat/page-routes-refactor branch test run (2026-04-11)

---

## Completed

(None yet)
