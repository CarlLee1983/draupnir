# Technology Stack

**Analysis Date:** 2026-04-10

## Languages

**Primary:**
- TypeScript 5.3.0 - Backend application, domain logic, services, controllers
- JavaScript/JSX - Frontend React components (React 19.2.5)

**Secondary:**
- YAML 2.6.0 - Configuration files
- SQL - Database schema and migrations

## Runtime

**Environment:**
- Bun (runtime and package manager, latest) - Primary runtime for backend services, build toolchain, and test runner
- Node.js compatible (ES2020 target)

**Package Manager:**
- Bun - Primary dependency manager and task runner
- Lockfile: `bun.lock` (present, committed)

## Frameworks

**Core Backend:**
- Gravito DDD Framework (@gravito/core 3.0.1) - Application framework implementing Domain-Driven Design pattern
  - @gravito/prism 3.1.1 - ORM abstraction layer
  - @gravito/stasis 3.2.0 - Persistence layer
  - @gravito/impulse 2.0.0 - Schema validation
  - @gravito/atlas 2.0.0 - External dependency
  - @gravito/plasma 2.0.0 - Component system
  - @gravito/signal 3.1.0 - Event signaling
  - @gravito/sentinel 4.0.1 - Security/validation

**Frontend:**
- React 19.2.5 - UI framework
- Inertia.js 3.0.3 (@inertiajs/react) - Server-side rendering bridge
- Vite 8.0.8 - Build tool and dev server for frontend

**Testing:**
- Bun test - Native Bun testing framework (preferred for unit/integration)
- Vitest 4.0.18 - Alternative test runner compatibility
- Playwright 1.48.0 (@playwright/test) - End-to-end testing

**Build/Dev:**
- Biome 2.4.11 - Linter and formatter (replaces ESLint + Prettier)
- TypeScript 5.3.0 (tsc) - Type checking
- Drizzle Kit 0.31.9 - Database migration tooling

## Key Dependencies

**Critical (Bifrost Integration):**
- fetch (native Bun/Browser API) - HTTP client for Bifrost API calls
  - Used in: `src/Foundation/Infrastructure/Services/BifrostClient/` for all Bifrost communication
  - Bearer token authentication via Authorization header
  - Automatic retry with exponential backoff (configurable: 3 retries, 500ms base delay)

**Database & ORM:**
- @libsql/client 0.17.0 - SQLite client (Turso/LibSQL compatible)
- drizzle-orm 0.45.1 - Type-safe ORM layer
- Schema location: `src/Shared/Infrastructure/Database/Adapters/Drizzle/schema.ts`

**Authentication:**
- jsonwebtoken 9.0.0 (@types/jsonwebtoken 9.0.7) - JWT token generation and verification
  - Implemented in: `src/Modules/Auth/Application/Services/JwtTokenService.ts`
  - Token blacklist stored in `authTokens` table

**Validation & Forms:**
- zod 4.3.6 - Schema validation and type inference
- @hookform/resolvers 5.2.2 - Form validation integration
- react-hook-form 7.72.1 - React form management
- ajv 8.18.0, ajv-formats 3.0.1 - JSON Schema validation

**UI Components:**
- @radix-ui/* (various) - Headless UI component library (avatar, dialog, dropdown, label, separator, slot, toast)
- lucide-react 1.8.0 - Icon library
- recharts 3.8.1 - Charting library
- tailwindcss 3 - CSS utility framework
- tailwind-merge 3.5.0 - Tailwind class merging
- class-variance-authority 0.7.1 - Component variant management

**Tables & Data:**
- @tanstack/react-table 8.21.3 - Headless table component (for dashboard displays)

**Dev/Testing Support:**
- @types/bun 1.3.10 - Bun type definitions
- @types/react 19.2.14, @types/react-dom 19.2.3 - React type definitions
- mongodb 7.1.1 - MongoDB driver (dev/testing only)
- autoprefixer 10.4.27, postcss 8.5.9 - CSS processing pipeline
- @vitejs/plugin-react 6.0.1 - Vite React plugin
- yaml 2.6.0 - YAML parsing for config

## Configuration Files

**TypeScript:**
- `tsconfig.json` - Main backend config (ES2020 target, strict mode enabled)
- `tsconfig.frontend.json` - Frontend React config
- Path aliases: `@/*` → `./src/*`

**Build & Tools:**
- `vite.config.ts` - Frontend build config
  - Input: `resources/js/app.tsx`
  - Output: `public/build/`
- `biome.json` - Linter and formatter settings
  - Line width: 100 characters
  - Indent: 2 spaces
  - Excludes: dist, node_modules, coverage, playwright-report, src/views
- `playwright.config.ts` - E2E test configuration

**Application:**
- `config/app.ts` - App name, environment, port, debug settings
- `src/bootstrap.ts` - DDD application bootstrap sequence
- `src/app.ts` - Application factory function

## Environment Configuration

**Required environment variables (from `.env`):**
- `BIFROST_API_URL` - Bifrost AI Gateway base URL (required for BifrostClient initialization)
- `BIFROST_MASTER_KEY` - Bifrost API master key for governance operations (required)
- `DATABASE_URL` - LibSQL/SQLite connection string (default: `file:local.db`)
- `APP_ENV` - Application environment (development/production)
- `PORT` - HTTP server port (default: 3000)
- `APP_NAME` - Application identifier (default: draupnir)
- `APP_URL` - Public application URL
- `APP_DEBUG` - Debug mode flag

**Optional:**
- `ENABLE_DB` - Enable/disable database (default: enabled)
- `CACHE_DRIVER` - Cache backend selection (memory/redis/other)
- `ENABLE_FRONTEND` - Frontend dev server toggle

Configuration loading: `config/app.ts` (read at bootstrap time via `buildConfig()`)

## Platform Requirements

**Development:**
- Bun 1.0+ runtime
- TypeScript 5.3+
- Node.js compatible environment (for CLI compatibility)
- POSIX shell (for scripts in `scripts/`)

**Production:**
- Bun 1.0+ runtime
- SQLite-compatible database (LibSQL/Turso for remote)
- Bifrost AI Gateway 1.0+ (API Gateway dependency)
- Network access to Bifrost API endpoints

**Build Output:**
- Backend: `dist/index.js` (ESM format, Bun target)
- Frontend: `public/build/` (Vite bundle)

## Build & Startup

**Development:**
```bash
bun run dev                    # Hot reload backend
bun run dev:debug             # Debug mode with inspector
bun run dev:frontend          # Vite dev server
bun run dev:all               # Both backend and frontend
```

**Production:**
```bash
bun run build                 # Build backend and frontend
bun start                     # Start production server
bun run verify                # Full check (typecheck, lint, test)
```

**Test Suite:**
```bash
bun test                      # Run all tests (Bun native)
bun test --watch              # Watch mode
bun test --coverage           # With coverage report
bun test:feature              # Feature/acceptance tests
bun test:e2e                  # Playwright E2E tests
bun test:e2e:debug            # E2E with debug UI
```

---

*Stack analysis: 2026-04-10*
