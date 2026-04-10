# LLM Gateway Abstraction & Bifrost SDK Extraction Design

**Date:** 2026-04-10  
**Status:** Design Phase  
**Scope:** Decouple Draupnir from Bifrost, enable support for multiple LLM Gateway implementations

## Executive Summary

Currently, Draupnir is tightly coupled to Bifrost API Gateway through a direct `BifrostClient` dependency. This design proposes:

1. **Extract Bifrost Client into an independent SDK package** (`bifrost-sdk`)
2. **Create a unified `ILLMGatewayClient` abstraction layer** in Draupnir
3. **Implement Bifrost as one adapter** under this abstraction
4. **Enable seamless switching** to alternative gateways (OpenRouter, Gemini, etc.) at compile-time

This approach maintains current functionality while enabling future gateway flexibility without modifying business logic.

---

## Problem Statement

### Current State
- `BifrostClient` is embedded in `src/Foundation/Infrastructure/Services/BifrostClient/`
- Multiple modules depend directly on `BifrostClient` concrete class:
  - `AppKeyBifrostSync`
  - `GetAppKeyUsageService`
  - `QueryUsage`
- Switching to a different gateway would require modifying business layer code throughout the codebase
- Bifrost-specific API patterns (e.g., `createVirtualKey`, `getLogsStats`) leak into domain logic

### Why This Matters
- **Development Stage Agility:** Build time is when we decide the gateway, not runtime
- **Future Flexibility:** Support multiple gateways later without architectural rework
- **Code Health:** Bifrost is infrastructure, not domain logic
- **Reusability:** Bifrost SDK could be used in other projects

---

## Solution Design

### 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│ Draupnir Business Layer                                     │
│ (AppKeyBifrostSync, GetAppKeyUsageService, QueryUsage)     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ ILLMGatewayClient (Interface)                               │
│ - createKey(request): Promise<KeyResponse>                 │
│ - updateKey(keyId, request): Promise<KeyResponse>         │
│ - deleteKey(keyId): Promise<void>                          │
│ - getUsageStats(keyId, query): Promise<UsageStats>        │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        ↓            ↓            ↓
  ┌──────────┐  ┌──────────┐  ┌──────────┐
  │ Bifrost  │  │ OpenRoute│  │ (Future) │
  │ Adapter  │  │ Adapter  │  │ Adapter  │
  └────┬─────┘  └──────────┘  └──────────┘
       │
       ↓
┌─────────────────────────────────────────────────────────────┐
│ bifrost-sdk (Independent Package)                          │
│ - BifrostClient                                            │
│ - BifrostClientConfig                                      │
│ - Types, Errors, Retry Logic                              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
            Bifrost API Gateway
```

### 2. Core Components

#### 2.1 Unified Interface (`ILLMGatewayClient`)

**Location:** `src/Foundation/Infrastructure/Services/LLMGateway/ILLMGatewayClient.ts`

```typescript
export interface ILLMGatewayClient {
  // Key Management
  createKey(request: CreateKeyRequest): Promise<KeyResponse>
  updateKey(keyId: string, request: UpdateKeyRequest): Promise<KeyResponse>
  deleteKey(keyId: string): Promise<void>
  
  // Usage Tracking
  getUsageStats(keyId: string, query?: UsageQuery): Promise<UsageStats>
}
```

**Data Types:** See Section 2.2

**Design Rationale:**
- Abstracts Gateway-specific concepts (Virtual Keys, Models, etc.) into unified API
- Command-based naming (`createKey` not `createVirtualKey`) aligns with domain language
- snake_case (Bifrost) → camelCase (application) conversion happens at adapter boundary
- All types use non-optional fields to ensure contract compliance

#### 2.2 Shared Type Definitions

**Location:** `src/Foundation/Infrastructure/Services/LLMGateway/types.ts`

```typescript
export interface CreateKeyRequest {
  readonly name: string
  readonly customerId: string
}

export interface UpdateKeyRequest {
  readonly isActive?: boolean
}

export interface KeyResponse {
  readonly id: string
  readonly name: string
  readonly value?: string
  readonly isActive: boolean
}

export interface UsageQuery {
  readonly startTime?: string
  readonly endTime?: string
}

export interface UsageStats {
  readonly totalRequests: number
  readonly totalCost: number
  readonly totalTokens: number
  readonly avgLatency: number
}
```

**Design Rationale:**
- `readonly` properties enforce immutability
- Optional fields only where conceptually optional (Gateway-specific fields)
- Stats always numeric to enable consistent aggregation across gateways

#### 2.3 Bifrost Adapter Implementation

**Location:** `src/Foundation/Infrastructure/Services/LLMGateway/implementations/BifrostGatewayClient.ts`

Maps Bifrost SDK calls to unified interface:

```typescript
export class BifrostGatewayClient implements ILLMGatewayClient {
  constructor(private readonly bifrostClient: BifrostClient) {}

  async createKey(request: CreateKeyRequest): Promise<KeyResponse> {
    const vk = await this.bifrostClient.createVirtualKey({
      name: request.name,
      customer_id: request.customerId,
    })
    return {
      id: vk.id,
      name: vk.name,
      value: vk.value,
      isActive: vk.is_active,
    }
  }

  async getUsageStats(keyId: string, query?: UsageQuery): Promise<UsageStats> {
    const stats = await this.bifrostClient.getLogsStats({
      virtual_key_ids: keyId,
      ...(query?.startTime && { start_time: query.startTime }),
      ...(query?.endTime && { end_time: query.endTime }),
    })
    return {
      totalRequests: stats.total_requests,
      totalCost: stats.total_cost,
      totalTokens: stats.total_tokens,
      avgLatency: stats.avg_latency,
    }
  }

  // updateKey, deleteKey similarly mapped
}
```

**Design Rationale:**
- Adapter is thin—only handles type/naming conversion
- Error handling delegates to error boundaries (catch at ServiceProvider level)
- Future adapters follow same pattern

#### 2.4 Error Handling

**Location:** `src/Foundation/Infrastructure/Services/LLMGateway/errors.ts`

```typescript
export class GatewayError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly originalError?: Error
  ) {
    super(message)
    this.name = 'GatewayError'
  }
}
```

Adapters catch gateway-specific errors and re-throw as `GatewayError`:

```typescript
try {
  const vk = await this.bifrostClient.createVirtualKey({...})
  return {...}
} catch (error) {
  if (isBifrostApiError(error)) {
    throw new GatewayError(error.message, error.statusCode, error)
  }
  throw error
}
```

### 3. File Structure

**Before (Current State)**
```
src/Foundation/Infrastructure/Services/
└── BifrostClient/
    ├── BifrostClient.ts
    ├── BifrostClientConfig.ts
    ├── types.ts
    ├── errors.ts
    ├── retry.ts
    └── index.ts
```

**After (Proposed State)**
```
draupnir/src/Foundation/Infrastructure/Services/
└── LLMGateway/
    ├── ILLMGatewayClient.ts        (Interface)
    ├── types.ts                     (Shared types)
    ├── errors.ts                    (Gateway errors)
    ├── implementations/
    │   ├── BifrostGatewayClient.ts  (Bifrost adapter)
    │   └── OpenRouterClient.ts      (Future adapters)
    └── factory.ts                   (Optional: Gateway selection)

bifrost-sdk/                         (New independent package)
├── src/
│   ├── BifrostClient.ts
│   ├── BifrostClientConfig.ts
│   ├── types.ts
│   ├── errors.ts
│   ├── retry.ts
│   └── index.ts
├── package.json
├── tsconfig.json
└── README.md
```

### 4. Dependency Injection

#### Service Provider Registration

**Primary ServiceProvider (e.g., `AppServiceProvider` or main bootstrap)**

```typescript
// 1. Register Bifrost SDK Client
container.singleton('bifrostClient', () => {
  const config = createBifrostClientConfig()
  return new BifrostClient(config)
})

// 2. Register Gateway Adapter
container.singleton('llmGatewayClient', (c: IContainer) => {
  return new BifrostGatewayClient(c.make('bifrostClient') as BifrostClient)
})
```

**Module ServiceProviders**

Before:
```typescript
container.singleton('appKeyBifrostSync', (c: IContainer) => {
  return new AppKeyBifrostSync(c.make('bifrostClient') as BifrostClient)
})
```

After:
```typescript
container.singleton('appKeyBifrostSync', (c: IContainer) => {
  return new AppKeyBifrostSync(c.make('llmGatewayClient') as ILLMGatewayClient)
})
```

#### Business Layer Changes

All services depending on Bifrost change from:
```typescript
constructor(private readonly bifrostClient: BifrostClient) {}
```

To:
```typescript
constructor(private readonly gatewayClient: ILLMGatewayClient) {}
```

### 5. Data Flow Example

**Scenario:** Create API key for user organization

```
IssueAppKeyService.execute()
  ├─ Validates user authorization (DB query)
  ├─ Calls: gatewayClient.createKey({
  │    name: 'production-key',
  │    customerId: orgId
  │  })
  ├─ BifrostGatewayClient.createKey()
  │  ├─ Converts: customerId → customer_id
  │  ├─ Calls: bifrostClient.createVirtualKey({...})
  │  ├─ Bifrost SDK makes HTTP request
  │  └─ Maps response: vk.id → id, vk.is_active → isActive
  ├─ Stores mapping in DB: AppApiKey ↔ virtualKeyId
  └─ Returns KeyResponse to controller
```

### 6. Testing Strategy

#### Unit Tests

- **Gateway Interface Tests:** Mock implementations satisfy contract
- **Adapter Tests:** Bifrost responses map correctly to unified types
- **Error Handling Tests:** Bifrost errors convert to GatewayError

Example:
```typescript
describe('BifrostGatewayClient', () => {
  it('maps Bifrost response to unified KeyResponse', async () => {
    const mockResponse = {
      id: 'vk_123',
      name: 'test-key',
      is_active: true,
      value: 'secret'
    }
    bifrostClient.createVirtualKey.mockResolvedValue(mockResponse)
    
    const result = await adapter.createKey({...})
    
    expect(result).toEqual({
      id: 'vk_123',
      name: 'test-key',
      isActive: true,
      value: 'secret'
    })
  })
})
```

#### Integration Tests

- Existing tests for `AppKeyBifrostSync`, `GetAppKeyUsageService` require no changes in behavior
- Only dependency injection changes

---

## Migration Plan

### Phase 1: Create Abstraction Layer (Draupnir)
- [ ] Create `ILLMGatewayClient` interface and types
- [ ] Implement `BifrostGatewayClient` adapter
- [ ] Register in ServiceProvider
- **No breaking changes; BifrostClient still available**

### Phase 2: Migrate Business Layer
- [ ] Update `AppKeyBifrostSync` → inject `ILLMGatewayClient`
- [ ] Update `GetAppKeyUsageService` → inject `ILLMGatewayClient`
- [ ] Update `QueryUsage` → inject `ILLMGatewayClient`
- [ ] Update ServiceProvider dependency wiring
- [ ] Update unit tests to mock `ILLMGatewayClient`

### Phase 3: Extract Bifrost SDK
- [ ] Create new `bifrost-sdk` package repository
- [ ] Move `BifrostClient` and related code to `bifrost-sdk/src/`
- [ ] Publish `bifrost-sdk` to registry
- [ ] Update Draupnir `package.json` to depend on `@bifrost/sdk`
- [ ] Update imports in `BifrostGatewayClient`

### Phase 4: Cleanup
- [ ] Remove `src/Foundation/Infrastructure/Services/BifrostClient/` from Draupnir
- [ ] Verify all imports point to `bifrost-sdk`
- [ ] Update documentation

---

## Future Gateway Support

Adding a new gateway (e.g., OpenRouter) becomes straightforward:

1. Create `OpenRouterClient.ts` implementing `ILLMGatewayClient`
2. Add environment variable: `LLM_GATEWAY=openrouter`
3. Update ServiceProvider factory logic
4. No business layer changes needed

---

## Trade-offs & Decisions

| Decision | Rationale |
|----------|-----------|
| **Interface-first design** | Enables compile-time gateway selection; maximum decoupling |
| **Thin adapters** | Keep conversion logic simple; error handling at boundaries |
| **Immutable types** | Prevents accidental mutations; aligns with project conventions |
| **Standalone Bifrost SDK** | Reusable across projects; simpler lifecycle management |
| **Command-based naming** | Domain-neutral language; easier to reason about operations |

---

## Success Criteria

1. ✅ No business layer code mentions Bifrost SDK directly
2. ✅ All services depend on `ILLMGatewayClient` interface
3. ✅ Gateway can be switched by changing configuration/ServiceProvider
4. ✅ All existing tests pass without behavior modification
5. ✅ Bifrost SDK is independently published and versioned

---

## Risks & Mitigation

| Risk | Mitigation |
|------|-----------|
| **Breaking changes during migration** | Phase 1 runs in parallel; no breaking changes until Phase 2 |
| **Incomplete mapping of Bifrost APIs** | Document all used Bifrost endpoints; adapter covers 100% of current usage |
| **Future gateway incompatibility** | Design types based on common gateway patterns; extensibility in types as needed |

---

## References

- Current BifrostClient usage: `src/Modules/AppApiKey`, `src/Modules/SdkApi`, `src/Modules/Credit`
- DDD layering: See `docs/draupnir/knowledge/ddd-layering.md`
- Repository pattern: Existing patterns in `AppApiKeyRepository`, etc.
