# Design Spec: ApiKey & AppApiKey Acceptance Tests

**Date:** 2026-04-25
**Status:** Validated
**Topic:** Closing gaps in acceptance testing for AI and App API Keys.

## 1. Context & Purpose
The `ApiKey` and `AppApiKey` modules implement critical authentication and quota management logic. While unit tests exist, end-to-end acceptance tests are missing for key personas (Admin, Manager, Member) and specific business flows like key rotation and tenant isolation.

## 2. Personas
- **System Admin (Admin)**: Global oversight, can manage keys in any organization.
- **Organization Manager (Manager)**: Full control over keys within their own organization.
- **Member**: Limited to viewing/using assigned keys (for AI keys).

## 3. Test Scenarios

### 3.1 Member AI Keys (`ApiKey`)
File: `tests/Acceptance/UseCases/ApiKey/member-ai-keys.spec.ts`

- **Scenario: Lifecycle Management**
  - **Actor**: Manager
  - **Action**: Create key with `allowedModels`, `rateLimit`, and `expiresAt`. Update label later.
  - **Verification**: Database record exists, `key_hash` is present, and `IBifrostKeySync` mock was called.
- **Scenario: Access Control & Isolation**
  - **Actor**: Manager (Org A)
  - **Action**: Attempt to revoke a key belonging to Org B.
  - **Verification**: Expect `404 Not Found` or `403 Forbidden`.
- **Scenario: Global Admin Override**
  - **Actor**: System Admin
  - **Action**: Revoke any key regardless of organization.
  - **Verification**: Key status updated to `revoked` in DB.

### 3.2 System App Keys (`AppApiKey`)
File: `tests/Acceptance/UseCases/AppApiKey/system-app-keys.spec.ts`

- **Scenario: Issuance with Policy**
  - **Actor**: Manager
  - **Action**: Issue key with `rotationPolicy` and `boundModuleIds`.
  - **Verification**: Correct storage of rotation intervals and module IDs.
- **Scenario: Key Rotation Flow**
  - **Actor**: Manager
  - **Action**: Trigger manual rotation via `/rotate`.
  - **Verification**: 
    1. A new key is generated.
    2. The old key remains active if within `gracePeriodHours`.
    3. Bifrost sync is triggered for the new key.
- **Scenario: Scope & Usage**
  - **Actor**: Manager
  - **Action**: Update `scope` and fetch `usage` stats.
  - **Verification**: API returns 200 with correctly structured usage data.

## 4. Technical Strategy
- **Framework**: Vitest + `TestApp` (Internal framework).
- **Mocks**: Replace `IBifrostKeySync` and `IAppKeyBifrostSync` in the DI container during `TestApp.boot()`.
- **Database**: Direct assertions using `app.db` (Knex/Query Builder) after API calls.
- **Authentication**: Use `app.auth.persistedBearerHeaderFor` to simulate roles.

## 5. Success Criteria
- [ ] All tests pass without external service dependencies.
- [ ] 100% coverage of defined routes in `apikey.routes.ts` and `appApiKey.routes.ts`.
- [ ] Verified isolation between different organizations.
