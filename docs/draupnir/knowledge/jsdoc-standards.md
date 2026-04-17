# JSDoc and source documentation comments (normative)

This document is the **single source of truth** for `/** … */` documentation and related conventions in **TypeScript/JavaScript source** under this repository.

- **Architecture / markdown docs** (specs, diagrams, ADR-style narrative): see [`../ARCHITECTURE_DOCUMENTATION_STANDARDS.md`](../ARCHITECTURE_DOCUMENTATION_STANDARDS.md).
- **Repo language policy** (allowed languages in files): [`AGENTS.md`](../../../AGENTS.md).

---

## 1. Language

- **JSDoc and non-JSDoc code comments** in `src/` (and test code if you choose to comment there): use **English**.
- **User-facing runtime strings** (HTTP `message`, Zod error text, `throw new Error(…)` copy) may stay **Traditional Chinese (Taiwan)** or English per product/API consistency; this document does **not** require translating those strings when adding JSDoc.

---

## 2. What counts as “done” (avoid ambiguity)

| Activity | What it means |
|----------|----------------|
| **Locale / wording pass** | Only existing `/** … */` blocks were rewritten (e.g. zh-TW → English). Files that **never had** JSDoc are **unchanged** and may still be non-compliant. |
| **Normative compliance** | The file meets the **When to document** and **Required blocks** sections below. |

New code and files touched in a meaningful way (new public API, new service, behavior change) should reach **normative compliance** before merge.

---

## 3. When to document (by layer)

| Area | Expectation |
|------|-------------|
| **Domain** — aggregates, entities, value objects, domain services | File-level description; factories / rehydration / helpers with `@param` / `@returns`; `@throws` when constructors or parsing can throw. |
| **Application** — `*Service.ts`, use cases | See **§4 Application services (required)**. DTO files: short file-level purpose; document non-obvious fields only if needed. |
| **Presentation** — controllers, FormRequests, route modules | Class-level + each public handler; thin `*.routes.ts`: one file-level block for the route group. |
| **Pages / Inertia** — `src/Website/**` page classes, routing glue, `InertiaService` | Same as Presentation: **class-level** purpose (which path / React page); **each public** `handle` / `store` / `postAction` / `update` with `@param ctx` and `@returns`; route registration files (`register*Routes.ts` per slice) need a **file-level** block describing the declarative routing + DI pattern. |
| **Infrastructure** — repositories, providers, adapters | Class purpose; public methods that cross boundaries (DB, HTTP, cache). |
| **Shared** — middleware, framework adapters, cross-cutting types | Public exports and non-obvious behavior (side effects, status codes). |
| **Barrel `index.ts`** | Optional one-line file-level summary if the barrel is not self-evident. |
| **Tests** (`**/__tests__/**`, `*.test.ts`) | **No JSDoc requirement**; use clear `it('…')` names. A short file-level block is optional. |

---

## 4. Application services (required)

Every `*Service.ts` in `Application/Services/` (or equivalent) **MUST** have:

1. **File-level** `/** … */` immediately above imports (or directly above the class if the team agrees imports-first—prefer **comment block before imports** to match existing modules):
   - **Title line**: `ClassName`
   - **One sentence**: what use case it implements (application layer).
   - **`Responsibilities:`** bullet list (2–5 items): orchestration steps, not low-level implementation trivia.
   - **`Implementation note:`** (optional but encouraged when non-obvious): e.g. in-memory filtering, N+1 risk, assumed data size, transaction boundaries.

2. **Public entry method** (typically `execute`):
   - Summary line.
   - `@param` for each non-obvious parameter (or one line describing the request object’s important fields).
   - `@returns` describing success vs error shape at a high level.
   - `@throws` only if the method throws instead of returning a result object (unusual in this codebase).

Private helpers: document when non-obvious; otherwise omit.

---

## 5. Style rules (match reference types)

Reference implementations:

- Domain aggregate with richer JSDoc: [`src/Modules/Health/Domain/Aggregates/HealthCheck.ts`](../../../src/Modules/Health/Domain/Aggregates/HealthCheck.ts)
- Application service with file-level + `execute` + implementation note: [`src/Modules/Auth/Application/Services/ListUsersService.ts`](../../../src/Modules/Auth/Application/Services/ListUsersService.ts)

Rules:

1. **Lead with role** — What the unit is in DDD/HTTP terms; avoid repeating the type signature verbatim.
2. **Semantics over repetition** — Do not restate TypeScript types; document invariants, defaults, edge cases, and failure modes.
3. **Trivial getters** — One-line `/** … */`; omit redundant `@returns` if the name and return type are obvious.
4. **`@throws`** — Use `{Error}`, `{SyntaxError}`, etc., and the condition.
5. **Mutation** — If something mutates state in place, say so clearly.
6. **Line length** — Wrap prose near **100 columns** to align with Biome `lineWidth`.

---

## 6. Tooling (Biome)

Formatting and lint are enforced with **Biome** (`biome.json`).

Relevant formatter options (do not drift without team agreement):

| Option | Value | Effect |
|--------|--------|--------|
| `javascript.formatter.quoteStyle` | `"single"` | Single-quoted strings where formatter applies. |
| `javascript.formatter.semicolons` | `"asNeeded"` | Omit statement terminators when ASI is safe (project standard). |

Commands (from `package.json`):

- `bun run format` — `biome format src tests --write`
- `bun run lint` — `biome lint src tests`

If a file still shows unwanted semicolons after format, check `biome.json` rather than hand-editing.

---

## 7. Rollout

- **New** files: comply before merge.
- **Edited** files: bring touched types/services up to §3–§4 when you change public behavior or add APIs.
- **Legacy** code: improve opportunistically; no mandatory whole-repo JSDoc backlog unless a milestone explicitly tracks it.

---

## 8. 摘要（繁體中文）

- **程式內 `/** … */` 與技術向註解**：以 **英文** 為準（`src/`）。
- **僅做「翻譯／用語」批次**：不表示尚未撰寫 JSDoc 的檔案已符合規範。
- **Application `*Service.ts`**：**必須**有檔案頭說明（職責＋可選實作注意）以及 **`execute`（或主要公開方法）** 的 `@param`／`@returns`（與必要時的 `@throws`）。
- **格式化**：以 `biome.json` 為準；`semicolons: "asNeeded"`、`bun run format`。
- **架構類 Markdown 文件**：見 `ARCHITECTURE_DOCUMENTATION_STANDARDS.md`。
