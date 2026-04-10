# External Integrations

**Analysis Date:** 2026-04-10

## APIs & External Services

**Bifrost AI Gateway (Primary):**
- Service: Bifrost AI Gateway - LLM proxy and governance platform
  - Purpose: Model routing, virtual key management, rate limiting, budget enforcement, usage logging
  - SDK/Client: `src/Foundation/Infrastructure/Services/BifrostClient/` (custom TypeScript implementation)
  - Auth: Bearer token via `BIFROST_MASTER_KEY` (master key for governance operations)
  - Base URL: `BIFROST_API_URL` environment variable

**Bifrost API Surface (implemented in BifrostClient):**

**Virtual Keys Management:**
- `POST /api/governance/virtual-keys` - Create virtual key (AppApiKey creation flows)
- `GET /api/governance/virtual-keys` - List all virtual keys
- `GET /api/governance/virtual-keys/{vkId}` - Get single virtual key details
- `PUT /api/governance/virtual-keys/{vkId}` - Update virtual key configuration (status, budget, rate limits)
- `DELETE /api/governance/virtual-keys/{vkId}` - Delete virtual key (key revocation)
  - Implementation: `src/Foundation/Infrastructure/Services/BifrostClient/BifrostClient.ts` (lines 18-40)
  - Types: `src/Foundation/Infrastructure/Services/BifrostClient/types.ts` (BifrostVirtualKey, CreateVirtualKeyRequest, UpdateVirtualKeyRequest)

**Logs & Usage Tracking:**
- `GET /api/logs` - Query usage logs with filters (provider, model, status, date range, cost range, pagination)
- `GET /api/logs/stats` - Aggregated stats (total_requests, total_cost, total_tokens, avg_latency)
  - Query params: providers, models, status, virtual_key_ids, start_time, end_time, min_cost, max_cost, limit, offset, sort_by, order
  - Implementation: `src/Foundation/Infrastructure/Services/BifrostClient/BifrostClient.ts` (lines 42-52)
  - Consumer: `src/Modules/Dashboard/Infrastructure/Services/UsageAggregator.ts` (aggregates stats for dashboard)

**Models Listing:**
- `GET /v1/models` - List available models
  - Query params: provider, page_size, page_token
  - Implementation: `src/Foundation/Infrastructure/Services/BifrostClient/BifrostClient.ts` (lines 54-59)
  - Response: BifrostModel[] with id, canonical_slug, name, deployment, context_length, token limits

**LLM Proxy (for SDK):**
- `POST /v1/chat/completions` - Proxy model inference calls
  - Auth: Bearer token with virtual key (App API Key)
  - Implementation: `src/Modules/SdkApi/Application/UseCases/ProxyModelCall.ts` (lines 41-49)
  - Direct proxy without BifrostClient wrapper (uses native fetch)

**Bifrost Configuration & Retry Logic:**
- Config file: `src/Foundation/Infrastructure/Services/BifrostClient/BifrostClientConfig.ts`
  - `BIFROST_API_URL` - Gateway base URL (required, trailing slashes stripped)
  - `BIFROST_MASTER_KEY` - Master API key (required)
  - `timeoutMs` - Request timeout (default: 30,000ms)
  - `maxRetries` - Retry attempts (default: 3)
  - `retryBaseDelayMs` - Base exponential backoff (default: 500ms)

**Error Handling & Retry Strategy:**
- File: `src/Foundation/Infrastructure/Services/BifrostClient/retry.ts`
  - Retryable HTTP status codes: 429 (rate limit), 500, 502 (bad gateway), 503 (service unavailable), 504 (gateway timeout)
  - Retry strategy: Exponential backoff with jitter
    - Delay = baseDelayMs * 2^attempt + random(0, baseDelayMs)
  - Network errors (TypeError, fetch failures) also retry
  - Non-retryable errors throw immediately
- Error class: `src/Foundation/Infrastructure/Services/BifrostClient/errors.ts` (BifrostApiError)
  - Contains status code, endpoint, response body, isRetryable flag

**Bifrost Consumers:**
- `src/Modules/AppApiKey/Infrastructure/Services/AppKeyBifrostSync.ts` - Syncs Draupnir API keys with Bifrost virtual keys
  - createVirtualKey() - Creates Bifrost virtual key during AppApiKey issuance
  - deactivateVirtualKey() - Sets is_active=false on revocation
  - deleteVirtualKey() - Permanent deletion
- `src/Modules/SdkApi/Application/UseCases/ProxyModelCall.ts` - Direct proxy to LLM endpoints via Bifrost
- `src/Modules/SdkApi/Application/UseCases/QueryUsage.ts` - Queries Bifrost logs for SDK usage data
- `src/Modules/AppApiKey/Application/Services/GetAppKeyUsageService.ts` - Queries usage for app keys
- `src/Modules/Dashboard/Infrastructure/Services/UsageAggregator.ts` - Aggregates Bifrost stats for dashboard display

## Data Storage

**Databases:**
- **Type:** SQLite (LibSQL/Turso compatible)
  - Client: @libsql/client 0.17.0
  - ORM: Drizzle 0.45.1
  - Connection: `DATABASE_URL` (default: `file:local.db` - local SQLite file)
  - Remote variant: LibSQL/Turso URLs supported (https://...)

**Schema location:** `src/Shared/Infrastructure/Database/Adapters/Drizzle/schema.ts`

**Core Tables:**
- `users` - System users (email, password hash, role, status, timestamps)
- `auth_tokens` - JWT token records for blacklist management (user_id, token_hash, type, expires_at, revoked_at)
- `health_checks` - System health check history
- `api_keys` - Draupnir API keys (org_id, created_by_user_id, key_hash, bifrost_virtual_key_id, scope, expires_at)
- Additional: organization, profile, credit, contract, app_module tables (DDD domain entities)

**Initialization:** `src/Shared/Infrastructure/Database/Adapters/Drizzle/config.ts`
- Lazy singleton pattern: `getDrizzleInstance()` ensures single connection
- Migration system: `bun orbit migrate`, `bun orbit seed` for schema management

**File Storage:**
- Local filesystem only - No cloud storage integration detected
- Frontend static assets: `public/` directory via Vite

**Caching:**
- Memory-based default (in-process cache via Gravito)
- Configuration via `CACHE_DRIVER` env var
- No Redis/Memcached integration in current stack (optional via config)

## Authentication & Identity

**Auth Strategy:**
- **Type:** JWT-based custom authentication (not OAuth/external providers)
- Implementation: `src/Modules/Auth/`
  - User registration/login via email + scrypt-hashed password
  - JWT token generation: `src/Modules/Auth/Application/Services/JwtTokenService.ts`
  - Token storage: `authTokens` table for revocation tracking
  - Password hashing: Scrypt algorithm via `src/Modules/Auth/Infrastructure/Services/PasswordHasher.ts`

**Token Management:**
- JWT claims: User ID, role, status, refresh token expiry
- Refresh token flow: `src/Modules/Auth/Application/Services/RefreshTokenService.ts`
- Token revocation: `authTokens` table with `revoked_at` timestamp
- Token type: Bearer tokens in Authorization header

**API Key Authentication (SDK):**
- App API Key system for programmatic access
- Key format: Hashed and stored in `apiKeys` table
- Bifrost binding: Each Draupnir API key maps to a Bifrost virtual key via `bifrost_virtual_key_id`
- Scope-based permissions: 'read' (query only), 'write' (model calls + query)
- Module binding: Can be restricted to specific modules (e.g., 'ai_chat')

## Monitoring & Observability

**Error Tracking:**
- None detected - No Sentry, Rollbar, or similar integration

**Logging:**
- Standard console.log approach (Biome allows console.log in config)
- Application startup messages: `src/index.ts` (colorized boot sequence)
- Module bootstrap logging: Each ServiceProvider logs boot status
- Bifrost errors: BifrostApiError with status code and endpoint details

**Health Checks:**
- Health module: `src/Modules/Health/`
- Endpoint: GET `/health` (basic system status)
- Database connectivity check (via Health module)

## CI/CD & Deployment

**Hosting:**
- Not specified - Self-hosted capable (runs on Bun runtime)
- Suggested: Any cloud supporting Bun (Fly.io, Railway, Render, custom VPS)

**CI Pipeline:**
- None configured - No GitHub Actions, GitLab CI, or similar detected
- Pre-commit hooks: `scripts/setup-hooks.sh` for local development checks

**Build Process:**
```bash
bun run build
# Produces:
# - Backend: dist/index.js (ESM, Bun target)
# - Frontend: public/build/manifest.json + assets (Vite)
```

**Database Migrations:**
- Orbit (Gravito's migration tool): `bun orbit migrate`
- Seed command: `bun orbit seed`
- Status check: `bun orbit migrate:status`

## Environment Configuration

**Required env vars (from BifrostClientConfig validation):**
- `BIFROST_API_URL` - Must be set, error if missing: "BIFROST_API_URL is required"
- `BIFROST_MASTER_KEY` - Must be set, error if missing: "BIFROST_MASTER_KEY is required"

**Recommended env vars:**
- `DATABASE_URL` - Explicit database connection
- `APP_ENV` - Environment identifier (development/staging/production)
- `PORT` - HTTP server port
- `APP_DEBUG` - Verbose logging

**Optional:**
- `ENABLE_DB` - Toggle database access (default: true)
- `CACHE_DRIVER` - Cache backend selection
- `VIEW_DIR` - Template directory for server-side rendering

**Secrets location:**
- `.env` file (not committed, local development only)
- `.env.example` - Template with safe placeholder values
- Production: Environment variables via deployment platform

## Webhooks & Callbacks

**Incoming:**
- None configured - No webhook endpoints detected

**Outgoing:**
- Bifrost integration is one-way (Draupnir calls Bifrost, no callbacks)
- Domain events: Event Sourcing via @gravito/signal (internal to Draupnir)
  - Used for: Credit top-ups, balance depletion notifications within application

---

*Integration audit: 2026-04-10*
