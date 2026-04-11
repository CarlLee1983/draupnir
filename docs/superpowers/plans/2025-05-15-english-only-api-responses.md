# English-Only API Responses Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all Chinese strings in API response messages, request validation, and associated tests with English counterparts. Ensure machine-readable error codes remain unchanged.

**Architecture:** 
- Standardize all user-facing `message` fields in DTOs and Services to English.
- Update `zod` validation schemas in Request classes to use English error messages.
- Update all associated test assertions to expect English strings.
- Maintain stability of machine-readable `error` code strings (e.g., `UNAUTHORIZED`).

**Tech Stack:** TypeScript, Bun, Vitest, Zod, Gravito Framework.

---

### Task 1: Update Auth Module (Services & Requests)

**Files:**
- Modify: `src/Modules/Auth/Application/Services/RegisterUserService.ts`
- Modify: `src/Modules/Auth/Presentation/Requests/LoginRequest.ts`
- Modify: `src/Modules/Auth/Presentation/Requests/RegisterRequest.ts`
- Modify: `src/Modules/Auth/Presentation/Requests/RefreshTokenRequest.ts`
- Modify: `src/Modules/Auth/Application/Services/RefreshTokenService.ts`
- Modify: `src/Modules/Auth/Application/Services/LogoutUserService.ts`
- Modify: `src/Modules/Auth/Application/Services/ListUsersService.ts`
- Modify: `src/Modules/Auth/Application/Services/GetUserDetailService.ts`
- Modify: `src/Modules/Auth/Application/Services/ChangeUserStatusService.ts`

- [ ] **Step 1: Write/Update failing tests for Auth Services**
Update `src/Modules/Auth/__tests__/LoginUserService.test.ts` and `src/Modules/Auth/__tests__/RegisterUserService.test.ts` to expect English.

- [ ] **Step 2: Run tests to verify they fail**
Run: `bun test src/Modules/Auth/__tests__/LoginUserService.test.ts`

- [ ] **Step 3: Update Auth Services and Requests to English**
Example for `RegisterUserService.ts`:
Replace `message: '此電子郵件已被註冊'` with `message: 'Email already exists'`.
Replace `error: '電子郵件不能為空'` with `error: 'Email is required'`.

- [ ] **Step 4: Run tests to verify they pass**
Run: `bun test src/Modules/Auth/__tests__/LoginUserService.test.ts`

- [ ] **Step 5: Commit**
`git commit -m "fix(auth): update messages to english"`

### Task 2: Update SdkApi Module

**Files:**
- Modify: `src/Modules/SdkApi/Presentation/Controllers/SdkApiController.ts`
- Modify: `src/Modules/SdkApi/Infrastructure/Middleware/AppAuthMiddleware.ts`
- Modify: `src/Modules/SdkApi/Application/UseCases/AuthenticateApp.ts`
- Modify: `src/Modules/SdkApi/Application/UseCases/ProxyModelCall.ts`
- Modify: `src/Modules/SdkApi/Application/UseCases/QueryUsage.ts`
- Modify: `src/Modules/SdkApi/Application/UseCases/QueryBalance.ts`

- [ ] **Step 1: Update SdkApi tests to expect English**
Update `src/Modules/SdkApi/__tests__/SdkApiController.test.ts`, etc.

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Update SdkApi implementation to English**

- [ ] **Step 4: Run tests to verify they pass**

- [ ] **Step 5: Commit**
`git commit -m "fix(sdk-api): update messages to english"`

### Task 3: Update AppModule, AppApiKey, and CliApi Modules

**Files:**
- Modify: `src/Modules/AppModule/Application/Services/*.ts`
- Modify: `src/Modules/AppApiKey/Application/Services/*.ts`
- Modify: `src/Modules/CliApi/Application/Services/*.ts`

- [ ] **Step 1: Update tests for these modules**

- [ ] **Step 2: Run tests to verify failure**

- [ ] **Step 3: Update implementation to English**

- [ ] **Step 4: Run tests to verify they pass**

- [ ] **Step 5: Commit**

### Task 4: Update Organization, Contract, and Credit Modules (Bulk)

**Files:**
- Modify: `src/Modules/Organization/Application/Services/*.ts`
- Modify: `src/Modules/Contract/Application/Services/*.ts`
- Modify: `src/Modules/Credit/Application/Services/*.ts`

- [ ] **Step 1: Update tests for these modules**

- [ ] **Step 2: Run tests to verify failure**

- [ ] **Step 3: Update implementation to English**

- [ ] **Step 4: Run tests to verify they pass**

- [ ] **Step 5: Commit**

### Task 5: Final Global Scan and Verification

- [ ] **Step 1: Global grep for Chinese characters in src/Modules**
Run: `grep -r '[一-龥]' src/Modules`
Ensure no user-facing messages remain.

- [ ] **Step 2: Run all module tests**
Run: `bun test src/Modules`

- [ ] **Step 3: Final Commit**
