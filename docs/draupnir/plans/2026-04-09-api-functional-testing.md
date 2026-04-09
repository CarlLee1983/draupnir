# API Functional Testing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fully automated API functional testing framework that reads `openapi.yaml` at runtime and dynamically generates endpoint tests + flow chain tests.

**Architecture:** Spec Walker parses OpenAPI paths to auto-generate per-endpoint tests (happy path, auth gate, schema validation, required fields). Flow Runner parses `x-test-flows` extensions to generate multi-step flow chain tests with variable extraction/injection. A parity checker ensures spec and actual routes stay in sync.

**Tech Stack:** Bun test, AJV (schema validation), yaml (YAML parser), fetch API

---

### Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install ajv and ajv-formats**

```bash
bun add -d ajv ajv-formats
```

`yaml` is already a devDependency.

- [ ] **Step 2: Verify install**

```bash
bun run typecheck
```

Expected: PASS (no type errors)

- [ ] **Step 3: Commit**

```bash
git add package.json bun.lock
git commit -m "chore: [testing] 新增 ajv ajv-formats 用於 API 功能性測試"
```

---

### Task 2: JSONPath Utility

**Files:**
- Create: `tests/Feature/lib/jsonpath.ts`
- Test: `tests/Feature/lib/__tests__/jsonpath.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/Feature/lib/__tests__/jsonpath.test.ts
import { describe, it, expect } from 'bun:test'
import { extractValue, resolveRef, resolveRefs } from '../jsonpath'

describe('extractValue', () => {
  const obj = {
    data: {
      user: { id: 'u1', email: 'a@b.com' },
      accessToken: 'tok123',
    },
    meta: { total: 5 },
  }

  it('extracts nested value with $.dot.path', () => {
    expect(extractValue(obj, '$.data.user.id')).toBe('u1')
  })

  it('extracts top-level value', () => {
    expect(extractValue(obj, '$.meta.total')).toBe(5)
  })

  it('returns undefined for missing path', () => {
    expect(extractValue(obj, '$.data.missing.field')).toBeUndefined()
  })

  it('handles null input gracefully', () => {
    expect(extractValue(null, '$.a.b')).toBeUndefined()
  })
})

describe('resolveRef', () => {
  const context = { token: 'abc', userId: 'u1' }

  it('resolves $.token from context', () => {
    expect(resolveRef('$.token', context)).toBe('abc')
  })

  it('returns literal string as-is', () => {
    expect(resolveRef('hello', context)).toBe('hello')
  })
})

describe('resolveRefs', () => {
  const context = { token: 'abc', userId: 'u1' }

  it('resolves $. references in object values', () => {
    const input = { name: 'Test', managerId: '$.userId' }
    expect(resolveRefs(input, context)).toEqual({ name: 'Test', managerId: 'u1' })
  })

  it('returns undefined for undefined input', () => {
    expect(resolveRefs(undefined, context)).toBeUndefined()
  })

  it('does not mutate original object', () => {
    const input = { a: '$.token' }
    const result = resolveRefs(input, context)
    expect(input.a).toBe('$.token')
    expect(result).toEqual({ a: 'abc' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test tests/Feature/lib/__tests__/jsonpath.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Write implementation**

```typescript
// tests/Feature/lib/jsonpath.ts

/**
 * Extract a value from an object using a simple $.dot.path notation.
 * Only supports dot-separated keys — no array indexing or wildcards.
 */
export function extractValue(obj: unknown, path: string): unknown {
  const keys = path.replace(/^\$\./, '').split('.')
  let current = obj
  for (const key of keys) {
    if (current == null || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[key]
  }
  return current
}

/**
 * Resolve a single string value — if it starts with $. resolve from context,
 * otherwise return the literal string.
 */
export function resolveRef(value: string, context: Record<string, unknown>): unknown {
  if (value.startsWith('$.')) {
    const key = value.slice(2)
    return context[key]
  }
  return value
}

/**
 * Deep-resolve all $. references in an object's string values.
 * Returns a new object — does not mutate the original.
 */
export function resolveRefs(
  obj: Record<string, unknown> | undefined,
  context: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (obj == null) return undefined
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string' && value.startsWith('$.')) {
      result[key] = resolveRef(value, context)
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result[key] = resolveRefs(value as Record<string, unknown>, context)
    } else {
      result[key] = value
    }
  }
  return result
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test tests/Feature/lib/__tests__/jsonpath.test.ts
```

Expected: PASS (all 7 tests)

- [ ] **Step 5: Commit**

```bash
git add tests/Feature/lib/jsonpath.ts tests/Feature/lib/__tests__/jsonpath.test.ts
git commit -m "feat: [testing] 新增 JSONPath 工具 — $.dot.path 取值與引用解析"
```

---

### Task 3: OpenAPI Spec Parser

**Files:**
- Create: `tests/Feature/lib/spec-parser.ts`
- Test: `tests/Feature/lib/__tests__/spec-parser.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/Feature/lib/__tests__/spec-parser.test.ts
import { describe, it, expect } from 'bun:test'
import { parseOpenAPI, type Operation } from '../spec-parser'
import { resolve } from 'path'

const SPEC_PATH = resolve(import.meta.dir, '../../../../docs/openapi.yaml')

describe('parseOpenAPI', () => {
  it('parses the spec file without errors', () => {
    const spec = parseOpenAPI(SPEC_PATH)
    expect(spec).toBeDefined()
    expect(spec.operations.length).toBeGreaterThan(0)
  })

  it('extracts method and path for each operation', () => {
    const spec = parseOpenAPI(SPEC_PATH)
    for (const op of spec.operations) {
      expect(['get', 'post', 'put', 'patch', 'delete']).toContain(op.method)
      expect(op.path).toMatch(/^\//)
    }
  })

  it('detects security requirement on protected endpoints', () => {
    const spec = parseOpenAPI(SPEC_PATH)
    const getMe = spec.operations.find(
      (op) => op.method === 'get' && op.path === '/api/users/me',
    )
    expect(getMe?.requiresAuth).toBe(true)
  })

  it('detects public endpoints without security', () => {
    const spec = parseOpenAPI(SPEC_PATH)
    const register = spec.operations.find(
      (op) => op.method === 'post' && op.path === '/api/auth/register',
    )
    expect(register?.requiresAuth).toBe(false)
  })

  it('extracts requestSchema with required fields', () => {
    const spec = parseOpenAPI(SPEC_PATH)
    const register = spec.operations.find(
      (op) => op.method === 'post' && op.path === '/api/auth/register',
    )
    expect(register?.requestSchema).toBeDefined()
    expect(register?.requiredFields).toContain('email')
    expect(register?.requiredFields).toContain('password')
  })

  it('extracts successStatus from first 2xx response', () => {
    const spec = parseOpenAPI(SPEC_PATH)
    const register = spec.operations.find(
      (op) => op.method === 'post' && op.path === '/api/auth/register',
    )
    expect(register?.successStatus).toBe(201)
  })

  it('extracts x-test-role when present', () => {
    const spec = parseOpenAPI(SPEC_PATH)
    const createOrg = spec.operations.find(
      (op) => op.method === 'post' && op.path === '/api/organizations',
    )
    expect(createOrg?.testRole).toBe('admin')
  })

  it('extracts x-test-flows when present', () => {
    const spec = parseOpenAPI(SPEC_PATH)
    expect(spec.flows).toBeDefined()
    expect(Object.keys(spec.flows).length).toBeGreaterThan(0)
  })

  it('extracts component schemas for $ref resolution', () => {
    const spec = parseOpenAPI(SPEC_PATH)
    expect(spec.componentSchemas).toBeDefined()
    expect(spec.componentSchemas['RegisterRequest']).toBeDefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test tests/Feature/lib/__tests__/spec-parser.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Write implementation**

```typescript
// tests/Feature/lib/spec-parser.ts
import { readFileSync } from 'fs'
import { parse as parseYAML } from 'yaml'

export interface Operation {
  method: string
  path: string
  tags: string[]
  summary: string
  requiresAuth: boolean
  requestSchema: Record<string, unknown> | null
  responseSchema: Record<string, unknown> | null
  requiredFields: string[]
  successStatus: number
  testRole: string | null
  testSetup: TestSetupStep[] | null
}

export interface TestSetupStep {
  operation: string
  body: Record<string, unknown>
}

export interface FlowStep {
  operation: string
  body?: Record<string, unknown>
  auth?: string
  expect?: {
    status?: number
    body?: Record<string, unknown>
  }
  extract?: Record<string, string>
}

export interface TestFlow {
  description: string
  setup?: string
  steps: FlowStep[]
}

export interface ParsedSpec {
  operations: Operation[]
  flows: Record<string, TestFlow>
  componentSchemas: Record<string, Record<string, unknown>>
}

export function parseOpenAPI(specPath: string): ParsedSpec {
  const raw = readFileSync(specPath, 'utf-8')
  const doc = parseYAML(raw)

  const componentSchemas: Record<string, Record<string, unknown>> =
    doc.components?.schemas ?? {}

  const operations: Operation[] = []

  for (const [path, methods] of Object.entries(doc.paths ?? {})) {
    const methodMap = methods as Record<string, any>
    for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
      const op = methodMap[method]
      if (!op) continue

      const requiresAuth = Array.isArray(op.security) && op.security.length > 0

      // Extract request schema
      let requestSchema: Record<string, unknown> | null = null
      let requiredFields: string[] = []
      const reqBody = op.requestBody?.content?.['application/json']?.schema
      if (reqBody) {
        requestSchema = resolveSchema(reqBody, componentSchemas)
        requiredFields = (requestSchema?.required as string[]) ?? []
      }

      // Extract response schema (first 2xx)
      let responseSchema: Record<string, unknown> | null = null
      let successStatus = 200
      for (const [code, resp] of Object.entries(op.responses ?? {})) {
        const statusCode = Number(code)
        if (statusCode >= 200 && statusCode < 300) {
          successStatus = statusCode
          const respSchema = (resp as any)?.content?.['application/json']?.schema
          if (respSchema) {
            responseSchema = resolveSchema(respSchema, componentSchemas)
          }
          break
        }
      }

      operations.push({
        method,
        path,
        tags: op.tags ?? [],
        summary: op.summary ?? '',
        requiresAuth,
        requestSchema,
        responseSchema,
        requiredFields,
        successStatus,
        testRole: op['x-test-role'] ?? null,
        testSetup: op['x-test-setup'] ?? null,
      })
    }
  }

  const flows: Record<string, TestFlow> = doc['x-test-flows'] ?? {}

  return { operations, flows, componentSchemas }
}

/**
 * Resolve a $ref to its actual schema definition.
 * If the schema has no $ref, return it as-is.
 */
function resolveSchema(
  schema: Record<string, unknown>,
  componentSchemas: Record<string, Record<string, unknown>>,
): Record<string, unknown> {
  if (schema.$ref && typeof schema.$ref === 'string') {
    // "#/components/schemas/RegisterRequest" → "RegisterRequest"
    const name = schema.$ref.split('/').pop()!
    return componentSchemas[name] ?? schema
  }
  return schema
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test tests/Feature/lib/__tests__/spec-parser.test.ts
```

Expected: Some tests will fail because `openapi.yaml` doesn't yet have the new fields (`x-test-role`, `x-test-flows`, corrected paths). That's expected — we'll fix the spec in Task 6. For now, verify the parser doesn't crash and basic extraction works.

- [ ] **Step 5: Commit**

```bash
git add tests/Feature/lib/spec-parser.ts tests/Feature/lib/__tests__/spec-parser.test.ts
git commit -m "feat: [testing] 新增 OpenAPI Spec Parser — 解析 paths, schemas, flows"
```

---

### Task 4: Request Builder

**Files:**
- Create: `tests/Feature/lib/request-builder.ts`
- Test: `tests/Feature/lib/__tests__/request-builder.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/Feature/lib/__tests__/request-builder.test.ts
import { describe, it, expect } from 'bun:test'
import { buildValidRequest } from '../request-builder'

describe('buildValidRequest', () => {
  it('generates email for string+format:email', () => {
    const schema = {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email' },
      },
      required: ['email'],
    }
    const result = buildValidRequest(schema)
    expect(result.email).toMatch(/@feature\.test$/)
  })

  it('generates uuid for string+format:uuid', () => {
    const schema = {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
      },
      required: ['id'],
    }
    const result = buildValidRequest(schema)
    expect(result.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    )
  })

  it('generates string with minLength+4 chars', () => {
    const schema = {
      type: 'object',
      properties: {
        password: { type: 'string', minLength: 8 },
      },
      required: ['password'],
    }
    const result = buildValidRequest(schema)
    expect((result.password as string).length).toBeGreaterThanOrEqual(12)
  })

  it('generates number for integer type', () => {
    const schema = {
      type: 'object',
      properties: {
        count: { type: 'integer' },
      },
    }
    const result = buildValidRequest(schema)
    expect(result.count).toBe(1)
  })

  it('generates boolean for boolean type', () => {
    const schema = {
      type: 'object',
      properties: {
        active: { type: 'boolean' },
      },
    }
    const result = buildValidRequest(schema)
    expect(result.active).toBe(true)
  })

  it('only generates required fields when onlyRequired is true', () => {
    const schema = {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email' },
        name: { type: 'string' },
      },
      required: ['email'],
    }
    const result = buildValidRequest(schema, { onlyRequired: true })
    expect(result.email).toBeDefined()
    expect(result.name).toBeUndefined()
  })

  it('returns empty object for null schema', () => {
    expect(buildValidRequest(null)).toEqual({})
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test tests/Feature/lib/__tests__/request-builder.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Write implementation**

```typescript
// tests/Feature/lib/request-builder.ts

interface PropertySchema {
  type?: string
  format?: string
  minLength?: number
  properties?: Record<string, PropertySchema>
  required?: string[]
}

interface BuildOptions {
  onlyRequired?: boolean
}

/**
 * Generate a valid request body from an OpenAPI schema definition.
 * Each invocation generates unique values (UUIDs, emails) to avoid collisions.
 */
export function buildValidRequest(
  schema: Record<string, unknown> | null,
  options?: BuildOptions,
): Record<string, unknown> {
  if (!schema) return {}
  const props = schema.properties as Record<string, PropertySchema> | undefined
  if (!props) return {}

  const requiredFields = (schema.required as string[]) ?? []
  const result: Record<string, unknown> = {}

  for (const [name, prop] of Object.entries(props)) {
    if (options?.onlyRequired && !requiredFields.includes(name)) continue
    result[name] = generateValue(name, prop)
  }

  return result
}

function generateValue(fieldName: string, prop: PropertySchema): unknown {
  if (prop.type === 'object' && prop.properties) {
    return buildValidRequest(prop as Record<string, unknown>)
  }

  if (prop.type === 'boolean') return true
  if (prop.type === 'integer' || prop.type === 'number') return 1

  if (prop.type === 'string') {
    if (prop.format === 'email') {
      return `test-${crypto.randomUUID().slice(0, 8)}@feature.test`
    }
    if (prop.format === 'uuid') {
      return crypto.randomUUID()
    }
    if (prop.minLength) {
      return 'A'.repeat(prop.minLength + 4)
    }
    return `test-${fieldName}`
  }

  return `test-${fieldName}`
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test tests/Feature/lib/__tests__/request-builder.test.ts
```

Expected: PASS (all 7 tests)

- [ ] **Step 5: Commit**

```bash
git add tests/Feature/lib/request-builder.ts tests/Feature/lib/__tests__/request-builder.test.ts
git commit -m "feat: [testing] 新增 Request Builder — 從 OpenAPI schema 自動產生 request body"
```

---

### Task 5: Schema Validator

**Files:**
- Create: `tests/Feature/lib/schema-validator.ts`
- Test: `tests/Feature/lib/__tests__/schema-validator.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/Feature/lib/__tests__/schema-validator.test.ts
import { describe, it, expect } from 'bun:test'
import { validateSchema, type ValidationResult } from '../schema-validator'

describe('validateSchema', () => {
  it('passes for valid data', () => {
    const schema = {
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name'],
    }
    const result = validateSchema({ name: 'hello' }, schema, {})
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('fails for missing required field', () => {
    const schema = {
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name'],
    }
    const result = validateSchema({}, schema, {})
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('fails for wrong type', () => {
    const schema = {
      type: 'object',
      properties: { count: { type: 'integer' } },
    }
    const result = validateSchema({ count: 'not-a-number' }, schema, {})
    expect(result.valid).toBe(false)
  })

  it('validates email format', () => {
    const schema = {
      type: 'object',
      properties: { email: { type: 'string', format: 'email' } },
    }
    const good = validateSchema({ email: 'a@b.com' }, schema, {})
    expect(good.valid).toBe(true)

    const bad = validateSchema({ email: 'not-email' }, schema, {})
    expect(bad.valid).toBe(false)
  })

  it('resolves $ref from component schemas', () => {
    const schema = { $ref: '#/components/schemas/Foo' }
    const components = {
      Foo: {
        type: 'object',
        properties: { x: { type: 'number' } },
        required: ['x'],
      },
    }
    const good = validateSchema({ x: 1 }, schema, components)
    expect(good.valid).toBe(true)

    const bad = validateSchema({}, schema, components)
    expect(bad.valid).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test tests/Feature/lib/__tests__/schema-validator.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Write implementation**

```typescript
// tests/Feature/lib/schema-validator.ts
import Ajv, { type ErrorObject } from 'ajv'
import addFormats from 'ajv-formats'

export interface ValidationResult {
  valid: boolean
  errors: ErrorObject[]
}

const ajv = new Ajv({ allErrors: true })
addFormats(ajv)

/**
 * Validate data against a JSON Schema.
 * Resolves $ref from componentSchemas if needed.
 */
export function validateSchema(
  data: unknown,
  schema: Record<string, unknown>,
  componentSchemas: Record<string, Record<string, unknown>>,
): ValidationResult {
  const resolved = resolveIfRef(schema, componentSchemas)

  // Register any referenced component schemas
  for (const [name, s] of Object.entries(componentSchemas)) {
    const schemaId = `#/components/schemas/${name}`
    if (!ajv.getSchema(schemaId)) {
      ajv.addSchema(s, schemaId)
    }
  }

  const validate = ajv.compile(resolved)
  const valid = validate(data)

  return {
    valid: !!valid,
    errors: validate.errors ?? [],
  }
}

function resolveIfRef(
  schema: Record<string, unknown>,
  componentSchemas: Record<string, Record<string, unknown>>,
): Record<string, unknown> {
  if (schema.$ref && typeof schema.$ref === 'string') {
    const name = (schema.$ref as string).split('/').pop()!
    return componentSchemas[name] ?? schema
  }
  return schema
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test tests/Feature/lib/__tests__/schema-validator.test.ts
```

Expected: PASS (all 5 tests)

- [ ] **Step 5: Commit**

```bash
git add tests/Feature/lib/schema-validator.ts tests/Feature/lib/__tests__/schema-validator.test.ts
git commit -m "feat: [testing] 新增 Schema Validator — AJV 驗證 response 結構"
```

---

### Task 6: Update OpenAPI Spec

**Files:**
- Modify: `docs/openapi.yaml`

This is the largest single task — we need to bring the spec in sync with actual routes, add response schemas, `x-test-role`, `x-test-setup`, and `x-test-flows`.

- [ ] **Step 1: Rewrite openapi.yaml with all actual routes and extensions**

Replace the entire `docs/openapi.yaml` with the complete spec. The full content is below. Key changes:
- Fix `/api/user/me` → `/api/users/me`
- Add all 24 missing endpoints (auth/refresh, auth/logout, users admin routes, org subresources, apikey routes, dashboard routes, health routes)
- Add response schemas for auth endpoints (RegisterResponse, LoginResponse, RefreshResponse, etc.)
- Add `x-test-role` on admin-only endpoints
- Add `x-test-setup` on endpoints needing pre-existing data
- Add `x-test-flows` at the top level

```yaml
openapi: 3.0.3
info:
  title: Draupnir API
  description: AI 服務管理平台 API，建構於 Bifrost AI Gateway 之上
  version: 0.1.0
servers:
  - url: http://localhost:3000
    description: 本地開發伺服器

paths:
  # === Health ===
  /health:
    get:
      tags: [Health]
      summary: 健康檢查
      responses:
        '200':
          description: 健康狀態
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/HealthResponse'

  /health/history:
    get:
      tags: [Health]
      summary: 健康檢查歷史
      responses:
        '200':
          description: 歷史紀錄

  # === Auth ===
  /api/auth/register:
    post:
      tags: [Auth]
      summary: 註冊新用戶
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/RegisterRequest'
      responses:
        '201':
          description: 註冊成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/RegisterResponse'
        '400':
          description: 驗證失敗或 Email 已存在

  /api/auth/login:
    post:
      tags: [Auth]
      summary: 用戶登入
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/LoginRequest'
      responses:
        '200':
          description: 登入成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/LoginResponse'
        '401':
          description: 認證失敗

  /api/auth/refresh:
    post:
      tags: [Auth]
      summary: 刷新 Token
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/RefreshRequest'
      responses:
        '200':
          description: 刷新成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/RefreshResponse'
        '401':
          description: Refresh Token 無效

  /api/auth/logout:
    post:
      tags: [Auth]
      summary: 登出
      security:
        - bearerAuth: []
      responses:
        '200':
          description: 登出成功

  # === User ===
  /api/users/me:
    get:
      tags: [User]
      summary: 取得個人資料
      security:
        - bearerAuth: []
      responses:
        '200':
          description: 成功取得資料
    put:
      tags: [User]
      summary: 更新個人資料
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpdateProfileRequest'
      responses:
        '200':
          description: 更新成功

  /api/users:
    get:
      tags: [User]
      summary: 列表所有用戶
      security:
        - bearerAuth: []
      x-test-role: admin
      responses:
        '200':
          description: 成功

  /api/users/{id}:
    get:
      tags: [User]
      summary: 取得指定用戶
      security:
        - bearerAuth: []
      x-test-role: admin
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      x-test-setup:
        - operation: post-/api/auth/register
          body: { email: "setup-user@feature.test", password: "SecurePass123" }
      responses:
        '200':
          description: 成功

  /api/users/{id}/status:
    patch:
      tags: [User]
      summary: 變更用戶狀態
      security:
        - bearerAuth: []
      x-test-role: admin
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ChangeStatusRequest'
      responses:
        '200':
          description: 成功

  # === Organization ===
  /api/organizations:
    post:
      tags: [Organization]
      summary: 建立組織
      security:
        - bearerAuth: []
      x-test-role: admin
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateOrgRequest'
      responses:
        '201':
          description: 建立成功
    get:
      tags: [Organization]
      summary: 列表組織
      security:
        - bearerAuth: []
      x-test-role: admin
      responses:
        '200':
          description: 成功取得列表

  /api/organizations/{id}:
    get:
      tags: [Organization]
      summary: 取得指定組織
      security:
        - bearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      x-test-setup:
        - operation: post-/api/organizations
          body: { name: "Setup Org", managerUserId: "$.adminUserId" }
      responses:
        '200':
          description: 成功
    put:
      tags: [Organization]
      summary: 更新組織
      security:
        - bearerAuth: []
      x-test-role: admin
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: 成功

  /api/organizations/{id}/status:
    patch:
      tags: [Organization]
      summary: 變更組織狀態
      security:
        - bearerAuth: []
      x-test-role: admin
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: 成功

  /api/organizations/{id}/members:
    get:
      tags: [Organization]
      summary: 列表組織成員
      security:
        - bearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: 成功

  /api/organizations/{id}/invitations:
    post:
      tags: [Organization]
      summary: 邀請成員
      security:
        - bearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/InvitationRequest'
      responses:
        '201':
          description: 邀請成功
    get:
      tags: [Organization]
      summary: 列表邀請
      security:
        - bearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: 成功

  /api/organizations/{id}/invitations/{invId}:
    delete:
      tags: [Organization]
      summary: 取消邀請
      security:
        - bearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
        - name: invId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: 成功

  /api/invitations/{token}/accept:
    post:
      tags: [Organization]
      summary: 接受邀請
      security:
        - bearerAuth: []
      parameters:
        - name: token
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: 成功

  /api/organizations/{id}/members/{userId}:
    delete:
      tags: [Organization]
      summary: 移除成員
      security:
        - bearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
        - name: userId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: 成功

  /api/organizations/{id}/members/{userId}/role:
    patch:
      tags: [Organization]
      summary: 變更成員角色
      security:
        - bearerAuth: []
      x-test-role: admin
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
        - name: userId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: 成功

  # === API Key ===
  /api/organizations/{orgId}/keys:
    post:
      tags: [ApiKey]
      summary: 建立 API Key
      security:
        - bearerAuth: []
      parameters:
        - name: orgId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateApiKeyRequest'
      responses:
        '201':
          description: 建立成功
    get:
      tags: [ApiKey]
      summary: 列表 API Keys
      security:
        - bearerAuth: []
      parameters:
        - name: orgId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: 成功

  /api/keys/{keyId}/revoke:
    post:
      tags: [ApiKey]
      summary: 撤銷 API Key
      security:
        - bearerAuth: []
      parameters:
        - name: keyId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: 成功

  /api/keys/{keyId}/label:
    patch:
      tags: [ApiKey]
      summary: 更新 API Key 標籤
      security:
        - bearerAuth: []
      parameters:
        - name: keyId
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpdateKeyLabelRequest'
      responses:
        '200':
          description: 成功

  /api/keys/{keyId}/permissions:
    put:
      tags: [ApiKey]
      summary: 設定 API Key 權限
      security:
        - bearerAuth: []
      parameters:
        - name: keyId
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/SetKeyPermissionsRequest'
      responses:
        '200':
          description: 成功

  # === Dashboard ===
  /api/organizations/{orgId}/dashboard:
    get:
      tags: [Dashboard]
      summary: Dashboard 摘要
      security:
        - bearerAuth: []
      parameters:
        - name: orgId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: 成功

  /api/organizations/{orgId}/dashboard/usage:
    get:
      tags: [Dashboard]
      summary: 使用量統計
      security:
        - bearerAuth: []
      parameters:
        - name: orgId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: 成功

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    RegisterRequest:
      type: object
      required: [email, password]
      properties:
        email:
          type: string
          format: email
        password:
          type: string
          minLength: 8
        confirmPassword:
          type: string

    LoginRequest:
      type: object
      required: [email, password]
      properties:
        email:
          type: string
          format: email
        password:
          type: string

    RefreshRequest:
      type: object
      required: [refreshToken]
      properties:
        refreshToken:
          type: string

    UpdateProfileRequest:
      type: object
      properties:
        displayName:
          type: string
        phone:
          type: string
        bio:
          type: string

    CreateOrgRequest:
      type: object
      required: [name, managerUserId]
      properties:
        name:
          type: string
        description:
          type: string
        slug:
          type: string
        managerUserId:
          type: string
          format: uuid

    ChangeStatusRequest:
      type: object
      required: [status]
      properties:
        status:
          type: string
          enum: [active, inactive, suspended]

    InvitationRequest:
      type: object
      required: [email, role]
      properties:
        email:
          type: string
          format: email
        role:
          type: string

    CreateApiKeyRequest:
      type: object
      required: [label]
      properties:
        label:
          type: string
        permissions:
          type: array
          items:
            type: string

    UpdateKeyLabelRequest:
      type: object
      required: [label]
      properties:
        label:
          type: string

    SetKeyPermissionsRequest:
      type: object
      required: [permissions]
      properties:
        permissions:
          type: array
          items:
            type: string

    RegisterResponse:
      type: object
      properties:
        success:
          type: boolean
        message:
          type: string
        data:
          type: object
          properties:
            id:
              type: string
            email:
              type: string
              format: email
            role:
              type: string

    LoginResponse:
      type: object
      properties:
        success:
          type: boolean
        message:
          type: string
        data:
          type: object
          properties:
            user:
              type: object
              properties:
                id:
                  type: string
                email:
                  type: string
            accessToken:
              type: string
            refreshToken:
              type: string

    RefreshResponse:
      type: object
      properties:
        success:
          type: boolean
        data:
          type: object
          properties:
            accessToken:
              type: string

    HealthResponse:
      type: object
      properties:
        success:
          type: boolean
        status:
          type: string
        timestamp:
          type: string

x-test-flows:
  auth-flow:
    description: 完整認證流程
    steps:
      - operation: post-/api/auth/register
        body:
          email: "flow-auth@feature.test"
          password: "SecurePass123"
        expect:
          status: 201
        extract:
          userId: "$.data.id"

      - operation: post-/api/auth/login
        body:
          email: "flow-auth@feature.test"
          password: "SecurePass123"
        expect:
          status: 200
          body:
            data.accessToken: { exists: true }
            data.refreshToken: { exists: true }
        extract:
          token: "$.data.accessToken"
          refreshToken: "$.data.refreshToken"

      - operation: get-/api/users/me
        auth: "$.token"
        expect:
          status: 200

      - operation: post-/api/auth/refresh
        body:
          refreshToken: "$.refreshToken"
        expect:
          status: 200
          body:
            data.accessToken: { exists: true }
        extract:
          newToken: "$.data.accessToken"

      - operation: post-/api/auth/logout
        auth: "$.token"
        expect:
          status: 200

  org-flow:
    description: 組織建立與列表（需要 admin 權限）
    setup: admin
    steps:
      - operation: post-/api/organizations
        auth: "$.adminToken"
        body:
          name: "Test Organization"
          managerUserId: "$.adminUserId"
        expect:
          status: 201

      - operation: get-/api/organizations
        auth: "$.adminToken"
        expect:
          status: 200
```

- [ ] **Step 2: Verify spec is valid YAML**

```bash
bun -e "import { parse } from 'yaml'; import { readFileSync } from 'fs'; const doc = parse(readFileSync('docs/openapi.yaml', 'utf-8')); console.log('Paths:', Object.keys(doc.paths).length); console.log('Flows:', Object.keys(doc['x-test-flows']).length)"
```

Expected: `Paths: 22`, `Flows: 2`

- [ ] **Step 3: Re-run spec-parser tests**

```bash
bun test tests/Feature/lib/__tests__/spec-parser.test.ts
```

Expected: PASS (all tests now pass with the updated spec)

- [ ] **Step 4: Commit**

```bash
git add docs/openapi.yaml
git commit -m "docs: [openapi] 補齊所有路由、response schema、x-test-flows 擴展"
```

---

### Task 7: Test Client

**Files:**
- Create: `tests/Feature/lib/test-client.ts`
- Test: `tests/Feature/lib/__tests__/test-client.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/Feature/lib/__tests__/test-client.test.ts
import { describe, it, expect } from 'bun:test'
import { TestClient, type TestResponse } from '../test-client'

describe('TestClient', () => {
  it('constructs with a base URL', () => {
    const client = new TestClient('http://localhost:3001')
    expect(client).toBeDefined()
  })

  it('builds correct URL from operation', () => {
    // We test the public request method indirectly through a real server
    // For now, just verify construction
    const client = new TestClient('http://localhost:3001')
    expect(client.getBaseURL()).toBe('http://localhost:3001')
  })

  it('formatError produces readable debug output', () => {
    const client = new TestClient('http://localhost:3001')
    const output = client.formatError({
      method: 'POST',
      path: '/api/auth/register',
      requestBody: { email: 'test@test.com' },
      status: 400,
      expectedStatus: 201,
      responseBody: { success: false, error: 'EMAIL_ALREADY_EXISTS' },
    })
    expect(output).toContain('POST')
    expect(output).toContain('/api/auth/register')
    expect(output).toContain('400')
    expect(output).toContain('201')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test tests/Feature/lib/__tests__/test-client.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Write implementation**

```typescript
// tests/Feature/lib/test-client.ts

export interface TestResponse {
  status: number
  json: unknown
  headers: Headers
}

interface ErrorInfo {
  method: string
  path: string
  requestBody?: unknown
  status: number
  expectedStatus: number
  responseBody?: unknown
}

export class TestClient {
  constructor(private baseURL: string) {}

  getBaseURL(): string {
    return this.baseURL
  }

  async request(
    operation: { method: string; path: string },
    options: { body?: unknown; auth?: string | null },
  ): Promise<TestResponse> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (options.auth) {
      headers['Authorization'] = `Bearer ${options.auth}`
    }

    const url = `${this.baseURL}${operation.path}`
    const res = await fetch(url, {
      method: operation.method.toUpperCase(),
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    })

    const contentType = res.headers.get('content-type') ?? ''
    const json = contentType.includes('json') ? await res.json() : null

    return { status: res.status, json, headers: res.headers }
  }

  async post(path: string, body: unknown): Promise<TestResponse> {
    return this.request({ method: 'post', path }, { body })
  }

  async get(path: string, auth?: string): Promise<TestResponse> {
    return this.request({ method: 'get', path }, { auth })
  }

  formatError(info: ErrorInfo): string {
    const lines = [
      `  Status: expected ${info.expectedStatus}, got ${info.status}`,
      '',
      '  Request:',
      `    ${info.method.toUpperCase()} ${this.baseURL}${info.path}`,
    ]
    if (info.requestBody) {
      lines.push(`    Body: ${JSON.stringify(info.requestBody)}`)
    }
    lines.push('', '  Response:', `    Status: ${info.status}`)
    if (info.responseBody) {
      lines.push(`    Body: ${JSON.stringify(info.responseBody)}`)
    }
    return lines.join('\n')
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test tests/Feature/lib/__tests__/test-client.test.ts
```

Expected: PASS (all 3 tests)

- [ ] **Step 5: Commit**

```bash
git add tests/Feature/lib/test-client.ts tests/Feature/lib/__tests__/test-client.test.ts
git commit -m "feat: [testing] 新增 Test Client — HTTP fetch 封裝 + 錯誤格式化"
```

---

### Task 8: Test Server Lifecycle + Admin Seed

**Files:**
- Create: `tests/Feature/lib/test-server.ts`
- Create: `tests/Feature/lib/admin-seed.ts`

No unit test for these — they manage server processes and are verified by integration in Tasks 10-12.

- [ ] **Step 1: Write test-server.ts**

```typescript
// tests/Feature/lib/test-server.ts
import { beforeAll, afterAll } from 'bun:test'
import type { Subprocess } from 'bun'

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001'
let serverProcess: Subprocess | null = null

export function getBaseURL(): string {
  return BASE_URL
}

export function setupTestServer(): void {
  if (process.env.API_BASE_URL) {
    throw new Error(
      '外部環境測試尚未就緒。需要先實作測試租戶隔離與 cleanup 機制。',
    )
  }

  beforeAll(async () => {
    serverProcess = Bun.spawn(['bun', 'run', 'src/index.ts'], {
      env: { ...process.env, PORT: '3001', ORM: 'memory' },
      stdout: 'ignore',
      stderr: 'pipe',
    })
    await waitForReady(`${BASE_URL}/health`, 15_000)
  })

  afterAll(() => {
    serverProcess?.kill()
    serverProcess = null
  })
}

async function waitForReady(url: string, timeoutMs: number): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url)
      if (res.ok) return
    } catch {
      // Server not ready yet
    }
    await Bun.sleep(200)
  }
  throw new Error(`Server failed to start within ${timeoutMs}ms at ${url}`)
}
```

- [ ] **Step 2: Write admin-seed.ts**

The admin seed works by directly calling the server's internal seed endpoint. Since we don't have direct MemoryDB access from the test process (server is a separate process), we need to update the user's role via the `users` table. The simplest approach: add a test-only `PATCH /api/__test__/seed-role` endpoint that only exists when `ORM=memory`.

For now, write the seed helper that will call this endpoint:

```typescript
// tests/Feature/lib/admin-seed.ts
import type { TestClient } from './test-client'

/**
 * Seed a user as admin by calling the test-only endpoint.
 * This endpoint only exists when ORM=memory.
 */
export async function seedAdminRole(
  client: TestClient,
  userId: string,
): Promise<void> {
  const res = await client.request(
    { method: 'patch', path: `/api/__test__/seed-role` },
    { body: { userId, role: 'admin' } },
  )
  if (res.status !== 200) {
    throw new Error(
      `Failed to seed admin role for ${userId}: ${JSON.stringify(res.json)}`,
    )
  }
}
```

- [ ] **Step 3: Add test-only seed endpoint to the application**

Create a new file `src/Modules/Auth/Presentation/Routes/test-seed.routes.ts`:

```typescript
// src/Modules/Auth/Presentation/Routes/test-seed.routes.ts
import type { IModuleRouter } from '@/Shared/Presentation/IModuleRouter'
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'

/**
 * Test-only seed routes. Only registered when ORM=memory.
 * These routes allow functional tests to set up admin users.
 */
export function registerTestSeedRoutes(
  router: IModuleRouter,
  db: IDatabaseAccess,
): void {
  router.patch('/api/__test__/seed-role', async (ctx) => {
    const body = await ctx.getJsonBody() as { userId: string; role: string }
    if (!body.userId || !body.role) {
      return ctx.json({ success: false, error: 'userId and role required' }, 400)
    }

    await db.table('users').where('id', '=', body.userId).update({ role: body.role })

    return ctx.json({ success: true, message: `Role set to ${body.role}` })
  })
}
```

- [ ] **Step 4: Register the seed route conditionally in bootstrap**

Modify `src/routes.ts` (or wherever routes are registered) to conditionally include test seed routes when `ORM=memory`:

Find the route registration section and add:

```typescript
// Only in test/memory mode
if (process.env.ORM === 'memory') {
  const { registerTestSeedRoutes } = await import(
    '@/Modules/Auth/Presentation/Routes/test-seed.routes'
  )
  registerTestSeedRoutes(router, db)
}
```

The exact integration point depends on how `src/routes.ts` currently works — the implementer should find where other module routes are registered and add this block nearby. The key requirement: `db` (the `IDatabaseAccess` instance) and `router` (the `IModuleRouter`) must be available.

- [ ] **Step 5: Commit**

```bash
git add tests/Feature/lib/test-server.ts tests/Feature/lib/admin-seed.ts src/Modules/Auth/Presentation/Routes/test-seed.routes.ts src/routes.ts
git commit -m "feat: [testing] 新增 test server 生命週期 + admin seed 機制"
```

---

### Task 9: Auth Helper

**Files:**
- Create: `tests/Feature/lib/auth-helper.ts`
- Test: (verified by integration in Tasks 11-12)

- [ ] **Step 1: Write auth-helper.ts**

```typescript
// tests/Feature/lib/auth-helper.ts
import { TestClient } from './test-client'
import { seedAdminRole } from './admin-seed'

export type AuthRole = 'user' | 'admin'

export interface AuthIdentity {
  token: string
  userId: string
  role: AuthRole
}

const identities: Record<AuthRole, AuthIdentity | null> = {
  user: null,
  admin: null,
}

/**
 * Ensure an authenticated identity exists for the given role.
 * Registers + logs in a test user. For admin, seeds the role before login.
 * Caches the identity — subsequent calls return the cached version.
 */
export async function ensureAuth(
  client: TestClient,
  role: AuthRole = 'user',
): Promise<AuthIdentity> {
  if (identities[role]) return identities[role]!

  const email = `test-${role}-${crypto.randomUUID().slice(0, 8)}@feature.test`
  const password = 'SecurePass123'

  // Register
  const regRes = await client.post('/api/auth/register', { email, password })
  if (regRes.status !== 201) {
    throw new Error(`ensureAuth register failed: ${JSON.stringify(regRes.json)}`)
  }
  const userId = (regRes.json as any).data.id

  // Seed admin role before login (so JWT has role=admin)
  if (role === 'admin') {
    await seedAdminRole(client, userId)
  }

  // Login
  const loginRes = await client.post('/api/auth/login', { email, password })
  if (loginRes.status !== 200) {
    throw new Error(`ensureAuth login failed: ${JSON.stringify(loginRes.json)}`)
  }

  const identity: AuthIdentity = {
    token: (loginRes.json as any).data.accessToken,
    userId,
    role,
  }
  identities[role] = identity
  return identity
}

/**
 * Reset cached identities. Call in beforeAll/afterAll to ensure clean state.
 */
export function resetAuth(): void {
  identities.user = null
  identities.admin = null
}
```

- [ ] **Step 2: Commit**

```bash
git add tests/Feature/lib/auth-helper.ts
git commit -m "feat: [testing] 新增 Auth Helper — 雙角色認證身份管理"
```

---

### Task 10: Route Extractor + Parity Test

**Files:**
- Create: `tests/Feature/lib/route-extractor.ts`
- Create: `tests/Feature/api-parity.test.ts`
- Test: `tests/Feature/lib/__tests__/route-extractor.test.ts`

- [ ] **Step 1: Write route-extractor test**

```typescript
// tests/Feature/lib/__tests__/route-extractor.test.ts
import { describe, it, expect } from 'bun:test'
import { extractRoutesFromSource } from '../route-extractor'

describe('extractRoutesFromSource', () => {
  it('extracts routes from all *.routes.ts files', () => {
    const routes = extractRoutesFromSource()
    expect(routes.length).toBeGreaterThan(0)
  })

  it('includes known auth routes', () => {
    const routes = extractRoutesFromSource()
    expect(routes).toContain('POST /api/auth/register')
    expect(routes).toContain('POST /api/auth/login')
    expect(routes).toContain('POST /api/auth/refresh')
    expect(routes).toContain('POST /api/auth/logout')
  })

  it('includes known org routes', () => {
    const routes = extractRoutesFromSource()
    expect(routes).toContain('POST /api/organizations')
    expect(routes).toContain('GET /api/organizations')
  })

  it('uses /api/users/me not /api/user/me', () => {
    const routes = extractRoutesFromSource()
    expect(routes).toContain('GET /api/users/me')
    expect(routes).not.toContain('GET /api/user/me')
  })

  it('excludes test-only routes (__test__)', () => {
    const routes = extractRoutesFromSource()
    const testRoutes = routes.filter((r) => r.includes('__test__'))
    expect(testRoutes).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test tests/Feature/lib/__tests__/route-extractor.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Write route-extractor implementation**

```typescript
// tests/Feature/lib/route-extractor.ts
import { readFileSync } from 'fs'

/**
 * Extract registered routes from *.routes.ts source files.
 * Parses router.get/post/put/patch/delete calls statically.
 * Returns normalized strings like "GET /api/auth/register".
 */
export function extractRoutesFromSource(): string[] {
  const routeFiles = Bun.globSync('src/Modules/*/Presentation/Routes/*.routes.ts')
  const routes: string[] = []

  // Match: router.get('/path', ...) or router.post('/path', [...], ...)
  const routePattern = /router\.(get|post|put|patch|delete)\(\s*['"`]([^'"`]+)['"`]/g

  for (const file of routeFiles) {
    const content = readFileSync(file, 'utf-8')
    let match: RegExpExecArray | null
    while ((match = routePattern.exec(content)) !== null) {
      const method = match[1].toUpperCase()
      const path = match[2]
      // Skip test-only routes
      if (path.includes('__test__')) continue
      // Normalize :param to {param} for comparison with OpenAPI
      const normalizedPath = path.replace(/:(\w+)/g, '{$1}')
      routes.push(`${method} ${normalizedPath}`)
    }
  }

  return routes.sort()
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test tests/Feature/lib/__tests__/route-extractor.test.ts
```

Expected: PASS (all 5 tests)

- [ ] **Step 5: Write api-parity.test.ts**

```typescript
// tests/Feature/api-parity.test.ts
import { describe, it, expect } from 'bun:test'
import { parseOpenAPI } from './lib/spec-parser'
import { extractRoutesFromSource } from './lib/route-extractor'
import { resolve } from 'path'

const SPEC_PATH = resolve(import.meta.dir, '../../docs/openapi.yaml')

describe('OpenAPI Spec / Route 一致性', () => {
  const spec = parseOpenAPI(SPEC_PATH)
  const specRoutes = spec.operations
    .map((op) => `${op.method.toUpperCase()} ${op.path}`)
    .sort()

  const actualRoutes = extractRoutesFromSource()

  it('所有已註冊路由都在 openapi.yaml 中有定義', () => {
    const missing = actualRoutes.filter((r) => !specRoutes.includes(r))
    if (missing.length > 0) {
      throw new Error(
        `以下路由未在 openapi.yaml 中定義:\n${missing.map((r) => `  - ${r}`).join('\n')}`,
      )
    }
  })

  it('openapi.yaml 中定義的路由都實際存在', () => {
    const orphaned = specRoutes.filter((r) => !actualRoutes.includes(r))
    if (orphaned.length > 0) {
      throw new Error(
        `以下 spec 路由在程式碼中不存在:\n${orphaned.map((r) => `  - ${r}`).join('\n')}`,
      )
    }
  })
})
```

- [ ] **Step 6: Run parity test**

```bash
bun test tests/Feature/api-parity.test.ts
```

Expected: PASS if the spec and routes are in sync. If not, fix discrepancies.

- [ ] **Step 7: Commit**

```bash
git add tests/Feature/lib/route-extractor.ts tests/Feature/lib/__tests__/route-extractor.test.ts tests/Feature/api-parity.test.ts
git commit -m "feat: [testing] 新增路由/Spec 一致性檢查 — 防止 drift"
```

---

### Task 11: Spec Walker — api-spec.test.ts

**Files:**
- Create: `tests/Feature/api-spec.test.ts`

This is the core Spec Walker that dynamically generates endpoint tests.

- [ ] **Step 1: Write api-spec.test.ts**

```typescript
// tests/Feature/api-spec.test.ts
import { describe, it, expect, beforeAll } from 'bun:test'
import { resolve } from 'path'
import { parseOpenAPI, type Operation } from './lib/spec-parser'
import { buildValidRequest } from './lib/request-builder'
import { validateSchema } from './lib/schema-validator'
import { TestClient } from './lib/test-client'
import { setupTestServer, getBaseURL } from './lib/test-server'
import { ensureAuth, resetAuth } from './lib/auth-helper'
import { resolveRefs } from './lib/jsonpath'

const SPEC_PATH = resolve(import.meta.dir, '../../docs/openapi.yaml')

setupTestServer()

const spec = parseOpenAPI(SPEC_PATH)
let client: TestClient

beforeAll(() => {
  client = new TestClient(getBaseURL())
})

/**
 * Get auth token for an operation based on its x-test-role.
 */
async function getAuthForOperation(op: Operation): Promise<string | null> {
  if (!op.requiresAuth) return null
  const role = op.testRole === 'admin' ? 'admin' : 'user'
  const identity = await ensureAuth(client, role as 'user' | 'admin')
  return identity.token
}

/**
 * Run x-test-setup steps before testing an endpoint that needs pre-existing data.
 */
async function runSetup(op: Operation): Promise<Record<string, unknown>> {
  const context: Record<string, unknown> = {}

  // Inject built-in variables
  const userIdentity = await ensureAuth(client, 'user')
  const adminIdentity = await ensureAuth(client, 'admin')
  context['authUserId'] = userIdentity.userId
  context['authToken'] = userIdentity.token
  context['adminUserId'] = adminIdentity.userId
  context['adminToken'] = adminIdentity.token

  if (!op.testSetup) return context

  for (const step of op.testSetup) {
    const [method, path] = parseOperationId(step.operation)
    const body = resolveRefs(step.body, context)
    const auth = context['adminToken'] as string
    await client.request({ method, path }, { body, auth })
  }

  return context
}

function parseOperationId(opId: string): [string, string] {
  const dashIndex = opId.indexOf('-')
  return [opId.slice(0, dashIndex), opId.slice(dashIndex + 1)]
}

/**
 * Check if an endpoint has path parameters (e.g. {id}).
 * These endpoints need setup data to provide real IDs — skip them if no x-test-setup.
 */
function hasPathParams(path: string): boolean {
  return path.includes('{')
}

for (const op of spec.operations) {
  // Skip endpoints with path params that have no test setup
  if (hasPathParams(op.path) && !op.testSetup) continue

  describe(`${op.method.toUpperCase()} ${op.path}`, () => {
    // 1. Happy path
    it(`回傳 ${op.successStatus}`, async () => {
      const auth = await getAuthForOperation(op)
      const body = buildValidRequest(op.requestSchema)
      const res = await client.request(
        { method: op.method, path: op.path },
        { body: Object.keys(body).length > 0 ? body : undefined, auth },
      )
      expect(res.status).toBe(op.successStatus)
    })

    // 2. Response schema validation
    if (op.responseSchema) {
      it('response 結構符合 OpenAPI spec', async () => {
        const auth = await getAuthForOperation(op)
        const body = buildValidRequest(op.requestSchema)
        const res = await client.request(
          { method: op.method, path: op.path },
          { body: Object.keys(body).length > 0 ? body : undefined, auth },
        )
        const validation = validateSchema(
          res.json,
          op.responseSchema!,
          spec.componentSchemas,
        )
        if (!validation.valid) {
          throw new Error(
            `Schema validation failed:\n${validation.errors.map((e) => `  - ${e.instancePath}: ${e.message}`).join('\n')}`,
          )
        }
      })
    }

    // 3. Auth gate
    if (op.requiresAuth) {
      it('未帶 token 回傳 401', async () => {
        const body = buildValidRequest(op.requestSchema)
        const res = await client.request(
          { method: op.method, path: op.path },
          { body: Object.keys(body).length > 0 ? body : undefined, auth: null },
        )
        expect(res.status).toBe(401)
      })
    }

    // 4. Required field validation
    if (op.requiredFields.length > 0) {
      it('缺少必填欄位回傳 400', async () => {
        const auth = await getAuthForOperation(op)
        const res = await client.request(
          { method: op.method, path: op.path },
          { body: {}, auth },
        )
        expect(res.status).toBe(400)
      })
    }
  })
}
```

- [ ] **Step 2: Run the spec walker tests**

```bash
bun test tests/Feature/api-spec.test.ts --timeout 30000
```

Expected: Most tests pass. Some may fail if the server doesn't handle certain edge cases as expected. Debug and fix any issues in the test infrastructure (not the application code).

- [ ] **Step 3: Commit**

```bash
git add tests/Feature/api-spec.test.ts
git commit -m "feat: [testing] 新增 Spec Walker — 動態生成 endpoint 獨立測試"
```

---

### Task 12: Flow Runner — api-flows.test.ts

**Files:**
- Create: `tests/Feature/api-flows.test.ts`

- [ ] **Step 1: Write flow assertion helper**

First, add the `assertBody` helper function to a shared location:

```typescript
// tests/Feature/lib/flow-assertions.ts

/**
 * Assert a response body matches expected assertions.
 * Supports: literal match, { exists: true }, { gt: N }, { contains: S }, { length: N }
 */
export function assertBody(
  json: unknown,
  assertions: Record<string, unknown>,
): void {
  for (const [path, expected] of Object.entries(assertions)) {
    const actual = getNestedValue(json, path)

    if (typeof expected === 'object' && expected !== null) {
      const assertion = expected as Record<string, unknown>
      if ('exists' in assertion) {
        if (assertion.exists && (actual === undefined || actual === null)) {
          throw new Error(`Expected ${path} to exist, got ${actual}`)
        }
      }
      if ('gt' in assertion) {
        if (typeof actual !== 'number' || actual <= (assertion.gt as number)) {
          throw new Error(`Expected ${path} > ${assertion.gt}, got ${actual}`)
        }
      }
      if ('contains' in assertion) {
        if (typeof actual !== 'string' || !actual.includes(assertion.contains as string)) {
          throw new Error(`Expected ${path} to contain "${assertion.contains}", got ${actual}`)
        }
      }
      if ('length' in assertion) {
        if (!Array.isArray(actual) || actual.length !== (assertion.length as number)) {
          throw new Error(
            `Expected ${path} length ${assertion.length}, got ${Array.isArray(actual) ? actual.length : 'not-array'}`,
          )
        }
      }
    } else {
      // Literal match
      if (actual !== expected) {
        throw new Error(`Expected ${path} = ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
      }
    }
  }
}

function getNestedValue(obj: unknown, path: string): unknown {
  const keys = path.split('.')
  let current = obj
  for (const key of keys) {
    if (current == null || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[key]
  }
  return current
}
```

- [ ] **Step 2: Write api-flows.test.ts**

```typescript
// tests/Feature/api-flows.test.ts
import { describe, it, expect, beforeAll } from 'bun:test'
import { resolve } from 'path'
import { parseOpenAPI } from './lib/spec-parser'
import { TestClient } from './lib/test-client'
import { setupTestServer, getBaseURL } from './lib/test-server'
import { ensureAuth, resetAuth } from './lib/auth-helper'
import { extractValue, resolveRefs, resolveRef } from './lib/jsonpath'
import { assertBody } from './lib/flow-assertions'

const SPEC_PATH = resolve(import.meta.dir, '../../docs/openapi.yaml')

setupTestServer()

const spec = parseOpenAPI(SPEC_PATH)
let client: TestClient

beforeAll(() => {
  client = new TestClient(getBaseURL())
})

function parseOperationId(opId: string): { method: string; path: string } {
  const dashIndex = opId.indexOf('-')
  return {
    method: opId.slice(0, dashIndex),
    path: opId.slice(dashIndex + 1),
  }
}

for (const [flowName, flow] of Object.entries(spec.flows)) {
  describe(`流程鏈: ${flow.description}`, () => {
    it('完成所有步驟', async () => {
      const context: Record<string, unknown> = {}

      // If flow requires admin setup, inject admin identity
      if (flow.setup === 'admin') {
        const admin = await ensureAuth(client, 'admin')
        context['adminToken'] = admin.token
        context['adminUserId'] = admin.userId
      }

      for (let i = 0; i < flow.steps.length; i++) {
        const step = flow.steps[i]
        const { method, path } = parseOperationId(step.operation)

        // Resolve $. references in body
        const body = step.body ? resolveRefs(step.body, context) : undefined

        // Resolve auth
        const auth = step.auth
          ? (resolveRef(step.auth, context) as string)
          : undefined

        // Execute request
        const res = await client.request({ method, path }, { body, auth })

        // Verify status
        if (step.expect?.status) {
          if (res.status !== step.expect.status) {
            throw new Error(
              `Step ${i + 1} (${step.operation}) failed:\n` +
                `  Expected status ${step.expect.status}, got ${res.status}\n` +
                `  Response: ${JSON.stringify(res.json)}`,
            )
          }
        }

        // Verify body assertions
        if (step.expect?.body) {
          assertBody(res.json, step.expect.body)
        }

        // Extract variables into context
        if (step.extract) {
          for (const [key, jsonPath] of Object.entries(step.extract)) {
            context[key] = extractValue(res.json, jsonPath)
            if (context[key] === undefined) {
              throw new Error(
                `Step ${i + 1}: Failed to extract "${key}" via "${jsonPath}" from:\n` +
                  `  ${JSON.stringify(res.json)}`,
              )
            }
          }
        }
      }
    })
  })
}
```

- [ ] **Step 3: Run the flow tests**

```bash
bun test tests/Feature/api-flows.test.ts --timeout 30000
```

Expected: Both auth-flow and org-flow pass end-to-end.

- [ ] **Step 4: Commit**

```bash
git add tests/Feature/lib/flow-assertions.ts tests/Feature/api-flows.test.ts
git commit -m "feat: [testing] 新增 Flow Runner — 流程鏈測試 + body 斷言"
```

---

### Task 13: Integration Verification

**Files:** None (verification only)

- [ ] **Step 1: Run all feature tests together**

```bash
bun test tests/Feature/ --timeout 30000
```

Expected: All tests pass — parity check, spec walker, and flow runner.

- [ ] **Step 2: Run all project tests to ensure no regressions**

```bash
bun test
```

Expected: All existing unit tests + new feature tests pass.

- [ ] **Step 3: Run typecheck**

```bash
bun run typecheck
```

Expected: No type errors.

- [ ] **Step 4: Fix any failures**

If any tests fail, debug and fix. Common issues:
- Path parameter endpoints needing setup data
- MemoryDB state leaking between tests (ensure each test uses unique emails)
- Timing issues with server startup

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "fix: [testing] 修正功能性測試整合問題"
```

(Only if there were fixes needed)

---

### Task 14: Update package.json Scripts

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Verify existing test:feature script works**

The `test:feature` script already exists in `package.json`:

```json
"test:feature": "bun test tests/Feature/"
```

No changes needed. Verify it works:

```bash
bun run test:feature
```

Expected: All feature tests pass.

- [ ] **Step 2: Commit**

No commit needed if no changes were made.
