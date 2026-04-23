# Technology Stack

Complete reference for all languages, runtimes, frameworks, dependencies, configurations, and deployment targets used in Draupnir.

---

## Languages

| Language | Version | Purpose | Usage |
|----------|---------|---------|-------|
| **TypeScript** | 5.3.0 | Backend, domain logic, services, controllers | `src/` |
| **JavaScript/JSX** | ES2020 | Frontend React components | `src/Pages/` |
| **YAML** | 2.6.0 | Configuration files, CI/CD | `config/`, `.github/` |
| **SQL** | — | Database schema, migrations | `migrations/`, `schema.ts` |

---

## Runtime & Build

| Tool | Version | Purpose |
|------|---------|---------|
| **Bun** | 1.0+ (latest) | Primary runtime, package manager, test runner, build tool |
| **Node.js** | compatible | ES2020 target, CLI compatibility (optional) |
| **Vite** | 8.0.8 | Frontend dev server and build (React) |

**Build Targets**:
- Backend: `dist/index.js` (ESM format, Bun runtime)
- Frontend: `public/build/` (Vite bundle, React + Inertia)

**Package Manager**: `bun` (replaces npm/yarn/pnpm)  
**Lockfile**: `bun.lock` (tracked in git)

---

## Core Frameworks

| Framework | Version | Purpose | Layer |
|-----------|---------|---------|-------|
| **Gravito DDD** | 3.0.1 | Application framework (DDD pattern) | Foundation/Application |
| **Gravito Atlas** | 2.0.0 | Primary ORM and Query Builder | Infrastructure |
| **React** | 19.2.5 | UI component library | Presentation/Frontend |
| **Inertia.js** | 3.0.3 | Server-side rendering bridge | Frontend |
| **Biome** | 2.4.11 | Linter + formatter (replaces ESLint + Prettier) | Tooling |

---

## Key Dependencies

### ORM & Persistence

| Package | Version | Purpose |
|---------|---------|---------|
| `@gravito/atlas` | 2.0.0 | Primary Type-safe ORM & Query Builder |
| `drizzle-orm` | 0.45.1 | Legacy ORM layer (being replaced) |
| `@libsql/client` | 0.17.0 | LibSQL/Turso database driver |
| **Schema location**: `src/Shared/Infrastructure/Database/Adapters/Atlas/schema.ts` |

**Database**: SQLite-compatible (Turso/LibSQL for remote, `file:local.db` for local)

### Authentication & Security

| Package | Version | Purpose |
|---------|---------|---------|
| `jsonwebtoken` | 9.0.0 | JWT token generation and verification |
| `@types/jsonwebtoken` | 9.0.7 | TypeScript definitions |
| `zod` | 4.3.6 | Schema validation and type inference |

**Secrets**: Environment variables (`.env`, `process.env.*`)

### Validation & Forms

| Package | Version | Purpose |
|---------|---------|---------|
| `zod` | 4.3.6 | Request schema validation (Presentation layer) |
| `@hookform/resolvers` | 5.2.2 | Form validation integration (Frontend) |
| `react-hook-form` | 7.72.1 | React form management |
| `ajv` | 8.18.0 | JSON Schema validation |
| `ajv-formats` | 3.0.1 | Additional format validators (email, UUID, etc.) |

### Testing

| Package | Version | Purpose |
|---------|---------|---------|
| **Bun test** | built-in | Native unit/integration tests |
| `vitest` | 4.0.18 | Alternative test runner (compatibility) |
| `@playwright/test` | 1.48.0 | End-to-end testing (Chromium, Firefox, WebKit) |

**Test ORM**: `ORM=memory` (in-memory adapter, no DB required)

### UI Components (Frontend)

| Package | Version | Purpose |
|---------|---------|---------|
| `@radix-ui/avatar` | latest | Headless avatar component |
| `@radix-ui/dialog` | latest | Modal/dialog primitives |
| `@radix-ui/dropdown-menu` | latest | Dropdown menu |
| `@radix-ui/label` | latest | Form label component |
| `@radix-ui/separator` | latest | Visual separator |
| `@radix-ui/slot` | latest | Component slot composition |
| `@radix-ui/toast` | latest | Toast notifications |
| `lucide-react` | 1.8.0 | Icon library |
| `recharts` | 3.8.1 | Chart and visualization library |
| `@tanstack/react-table` | 8.21.3 | Headless table component (for dashboards) |

### Styling

| Package | Version | Purpose |
|---------|---------|---------|
| `tailwindcss` | 3 | CSS utility framework |
| `tailwind-merge` | 3.5.0 | Merge and deduplicate Tailwind classes |
| `class-variance-authority` | 0.7.1 | Component variant management |
| `autoprefixer` | 10.4.27 | CSS vendor prefixing |
| `postcss` | 8.5.9 | CSS post-processing |

### Utilities

| Package | Version | Purpose |
|---------|---------|---------|
| `yaml` | 2.6.0 | YAML parsing for configuration |
| `mongodb` | 7.1.1 | MongoDB driver (dev/testing only) |

### Type Definitions

| Package | Version | Purpose |
|---------|---------|---------|
| `@types/bun` | 1.3.10 | Bun runtime types |
| `@types/react` | 19.2.14 | React type definitions |
| `@types/react-dom` | 19.2.3 | React DOM type definitions |

### Build & Development

| Package | Version | Purpose |
|---------|---------|---------|
| `@vitejs/plugin-react` | 6.0.1 | Vite React plugin (JSX compilation) |

---

## Configuration Files

| File | Purpose | Location |
|------|---------|----------|
| **tsconfig.json** | TypeScript compiler options (backend) | Root |
| **tsconfig.frontend.json** | TypeScript compiler options (frontend React) | Root |
| **biome.json** | Biome linter + formatter rules | Root |
| **vite.config.ts** | Vite dev server + build config | Root |
| **playwright.config.ts** | E2E test configuration (Playwright) | Root |
| **config/app.ts** | Application name, environment, port, debug settings | `config/` |

### TypeScript Configuration

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020"],
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@gravito/prism": ["./node_modules/@gravito/prism"],
      "@gravito/signal": ["./node_modules/@gravito/signal"],
      "@gravito/stasis": ["./node_modules/@gravito/stasis"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "build"]
}
```

### Biome Configuration

```json
{
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "style": {
        "noConsole": false,
        "useSingleQuote": true
      }
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentSize": 2,
    "lineWidth": 100
  }
}
```

---

## Environment Variables

**Required Variables** (must be set before startup):

| Variable | Purpose | Example |
|----------|---------|---------|
| `BIFROST_API_URL` | Bifrost AI Gateway base URL | `https://api.bifrost.dev` |
| `BIFROST_MASTER_KEY` | Bifrost API master key for governance operations | `sk-proj-xxxxx` |
| `JWT_SECRET` | Secret for signing JWT tokens | (random string, min 32 chars) |

**Optional Variables** (have defaults):

| Variable | Purpose | Default |
|----------|---------|---------|
| `DATABASE_URL` | LibSQL/SQLite connection string | `file:local.db` |
| `PORT` | HTTP server port | `3000` |
| `APP_ENV` | Environment name (development/production) | `development` |
| `APP_NAME` | Application identifier | `draupnir` |
| `APP_URL` | Public application URL | `http://localhost:3000` |
| `APP_DEBUG` | Debug mode flag (verbose logging) | `false` |
| `ENABLE_DB` | Enable/disable database | `true` |
| `ORM` | Persistence backend | `atlas` |
| `DB_CONNECTION` | Database driver (sqlite/postgres/mysql) | `sqlite` |
| `CACHE_DRIVER` | Cache backend selection (memory/redis) | `memory` |
| `ENABLE_FRONTEND` | Enable frontend dev server | `true` |

**ORM Options**:
- `atlas` — LibSQL/Turso (default for production)
- `drizzle` — Drizzle ORM adapter
- `memory` — In-memory (test/CI environment)

**Cache Options**:
- `memory` — In-process cache
- `redis` — Redis cache (requires `REDIS_URL`)

---

## Build & Startup

### Backend Build Output

```
dist/
├── index.js           # Main application entry (ESM, Bun-runnable)
├── app.ts            # Compiled application factory
├── bootstrap.ts      # Service provider registration
└── ... (other modules compiled)
```

**Build command**: `bun run build`  
**Start command**: `bun dist/index.js`

### Frontend Build Output

```
public/
└── build/
    ├── index-XXX.js     # React app bundle
    ├── index-XXX.css    # Tailwind CSS
    └── manifest.json    # Asset manifest (for Inertia)
```

**Vite dev server**: `bun run dev` (on `http://localhost:5173`)  
**Production build**: `bun run build:frontend`

---

## Platform Requirements

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| **Bun runtime** | 1.0+ | Latest (automatic via `mise`) |
| **TypeScript** | 5.3 | 5.3+ (bundled) |
| **Node.js** | compatible | Optional (for CLI tools) |
| **Database** | SQLite 3.8+ | Turso/LibSQL remote |
| **Bifrost API** | 1.0+ | Latest |
| **Shell** | POSIX | bash/zsh/fish |

### OS Compatibility

- **macOS**: 10.15+
- **Linux**: Ubuntu 18.04+, Debian 10+
- **Windows**: WSL2 with Linux environment

---

## Dependency Statistics

- **Total dependencies**: ~50 (production)
- **Total dev dependencies**: ~20
- **No peer dependencies**: All versions pinned in `bun.lock`

**Locked versions**: All dependencies locked via `bun.lock` (committed).  
**No wildcard versions**: Reproducible builds guaranteed.

---

## Performance Considerations

### Bundle Size

- **Backend**: ~2-3 MB (with all modules)
- **Frontend**: ~150-200 KB gzipped (React + Tailwind + dependencies)

### Runtime

- **Cold start**: ~500ms (Bun + Gravito + DI initialization)
- **Memory**: ~80-150 MB (depends on ORM choice)
- **Database**: In-memory ORM for tests, Turso for production

### Caching

- Default: In-process memory cache
- Production: Redis recommended for multi-instance deployments

---

## Version Management

### TypeScript Target

All code compiles to **ES2020** for modern browser and Bun compatibility:
- Async/await (no callbacks)
- Destructuring
- Arrow functions
- Template literals
- Nullish coalescing
- Optional chaining

### Bun Compatibility

- Latest Bun APIs supported (v1.0+)
- No Node.js-specific polyfills needed
- `import` statements (ESM) throughout
- `Bun.serve()` for HTTP server

---

## Quick Reference

**Latest versions** (as of 2026-04-09):
```bash
Bun:        1.0+ (latest)
TypeScript: 5.3.0
React:      19.2.5
Vite:       8.0.8
Biome:      2.4.11
Drizzle:    0.45.1
Zod:        4.3.6
Playwright: 1.48.0
```

**Update dependencies**:
```bash
bun update                    # Update all
bun upgrade                   # Bun runtime upgrade
npm list                      # Check installed versions
```

**Check configuration**:
```bash
bun run tsc --version         # TypeScript version
bun run biome --version       # Biome version
biome check src/              # Lint and format check
```
