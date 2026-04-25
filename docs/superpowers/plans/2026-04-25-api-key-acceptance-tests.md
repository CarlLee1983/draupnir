# ApiKey & AppApiKey Acceptance Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement comprehensive acceptance tests for Member AI Keys (ApiKey) and System App Keys (AppApiKey) covering all major personas and lifecycle events.

**Architecture:** Use the existing `TestApp` acceptance testing framework. Mock external Bifrost sync services using fakes. Focus on API behavioral validation and database side-effects.

**Tech Stack:** Vitest, Knex (via `app.db`), InProcessHttpClient.

---

### Task 1: Setup Mocks and Fakes

**Files:**
- Create: `tests/Acceptance/support/fakes/FakeApiKeyBifrostSync.ts`
- Create: `tests/Acceptance/support/fakes/FakeAppKeyBifrostSync.ts`
- Modify: `tests/Acceptance/support/TestApp.ts`

- [ ] **Step 1: Create FakeApiKeyBifrostSync**
```typescript
import type { CreateVirtualKeyOptions, IBifrostKeySync } from '@/Modules/ApiKey/Application/Ports/IBifrostKeySync'

export class FakeApiKeyBifrostSync implements IBifrostKeySync {
  createCalls: CreateVirtualKeyOptions[] = []
  revokeCalls: string[] = []
  permissionUpdates: any[] = []

  async createVirtualKey(options: CreateVirtualKeyOptions): Promise<{ gatewayKeyId: string; secretValue: string }> {
    this.createCalls.push(options)
    return { gatewayKeyId: `mock_gw_${crypto.randomUUID()}`, secretValue: 'sk-test-secret' }
  }

  async revokeVirtualKey(gatewayKeyId: string): Promise<void> {
    this.revokeCalls.push(gatewayKeyId)
  }

  async setKeyPermissions(gatewayKeyId: string, permissions: any): Promise<void> {
    this.permissionUpdates.push({ gatewayKeyId, permissions })
  }

  async updateKeyBudget(gatewayKeyId: string, budget: any): Promise<void> {
    // noop
  }

  reset() {
    this.createCalls = []
    this.revokeCalls = []
    this.permissionUpdates = []
  }
}
```

- [ ] **Step 2: Create FakeAppKeyBifrostSync**
```typescript
import type { IAppKeyBifrostSync, AppKeySyncOptions } from '@/Modules/AppApiKey/Application/Ports/IAppKeyBifrostSync'

export class FakeAppKeyBifrostSync implements IAppKeyBifrostSync {
  createCalls: AppKeySyncOptions[] = []
  revokeCalls: string[] = []

  async syncAppKey(options: AppKeySyncOptions): Promise<{ gatewayKeyId: string; secretValue: string }> {
    this.createCalls.push(options)
    return { gatewayKeyId: `mock_app_gw_${crypto.randomUUID()}`, secretValue: 'app-sk-test-secret' }
  }

  async revokeAppKey(gatewayKeyId: string): Promise<void> {
    this.revokeCalls.push(gatewayKeyId)
  }

  reset() {
    this.createCalls = []
    this.revokeCalls = []
  }
}
```

- [ ] **Step 3: Update TestApp to include and reset fakes**
Modify `tests/Acceptance/support/TestApp.ts` to include `apiKeyBifrostSync` and `appKeyBifrostSync` in `boot()` and `reset()`.

- [ ] **Step 4: Commit Setup**
```bash
git add tests/Acceptance/support/fakes/ tests/Acceptance/support/TestApp.ts
git commit -m "test: setup mocks for api key acceptance tests"
```

---

### Task 2: Implement ApiKey Acceptance Tests

**Files:**
- Create: `tests/Acceptance/UseCases/ApiKey/member-ai-keys.spec.ts`

- [ ] **Step 1: Write lifecycle and isolation tests**
Include scenarios for:
- Manager creates a key for a member.
- Member views their own keys.
- Manager Org A cannot revoke Org B key.
- Admin can revoke any key.

- [ ] **Step 2: Run tests and verify**
Run: `npm test tests/Acceptance/UseCases/ApiKey/member-ai-keys.spec.ts`

- [ ] **Step 3: Commit**
```bash
git add tests/Acceptance/UseCases/ApiKey/member-ai-keys.spec.ts
git commit -m "test: add api key acceptance tests"
```

---

### Task 3: Implement AppApiKey Acceptance Tests

**Files:**
- Create: `tests/Acceptance/UseCases/AppApiKey/system-app-keys.spec.ts`

- [ ] **Step 1: Write rotation and scope tests**
Include scenarios for:
- Issuing app key with rotation policy.
- Manual rotation (verifying new key issuance).
- Setting scope/bound modules.
- Fetching usage data.

- [ ] **Step 2: Run tests and verify**
Run: `npm test tests/Acceptance/UseCases/AppApiKey/system-app-keys.spec.ts`

- [ ] **Step 3: Commit**
```bash
git add tests/Acceptance/UseCases/AppApiKey/system-app-keys.spec.ts
git commit -m "test: add app api key acceptance tests"
```
