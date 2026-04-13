---
phase: quick-260413-vsz
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/Modules/Auth/Domain/Repositories/IAuthRepository.ts
  - src/Modules/Auth/Infrastructure/Repositories/AuthRepository.ts
  - src/Modules/Auth/Application/Services/ListUsersService.ts
  - src/Modules/Auth/__tests__/ListUsersService.test.ts
autonomous: true
requirements: [PERF-filter-pushdown]

must_haves:
  truths:
    - "findAll() 帶篩選條件時，SQL WHERE 子句包含 role / status 篩選（不再撈全表）"
    - "分頁的 total 由 countAll() 在 DB 層算出，而非 in-memory filtered.length"
    - "keyword 篩選仍在 Service 層執行（需 profile join，無法下推）"
    - "所有既有 ListUsersService 測試繼續通過"
  artifacts:
    - path: "src/Modules/Auth/Domain/Repositories/IAuthRepository.ts"
      provides: "新增 UserListFilters 型別、更新 findAll 簽名、新增 countAll"
    - path: "src/Modules/Auth/Infrastructure/Repositories/AuthRepository.ts"
      provides: "實作帶 WHERE/orderBy/limit/offset 的 findAll 與 countAll"
    - path: "src/Modules/Auth/Application/Services/ListUsersService.ts"
      provides: "呼叫 countAll + findAll(filters)，移除 in-memory role/status 過濾"
  key_links:
    - from: "ListUsersService"
      to: "IAuthRepository.findAll / countAll"
      via: "UserListFilters 參數物件"
      pattern: "findAll\\(\\{.*role.*status"
---

<objective>
將 ListUsersService 中的 role / status 篩選邏輯下推至 IAuthRepository.findAll()，
並讓分頁 total count 改由 countAll() 在 DB 層完成。

Purpose: 效能優化 — 目前 findAll() 撈全表後在 Service 層 filter，資料量大時會造成不必要的
記憶體與 DB 傳輸壓力。keyword 篩選（需 profile displayName join）保留在 Service 層。

Output:
- IAuthRepository 新增 UserListFilters 型別與 countAll() 方法
- AuthRepository 實作帶 WHERE 的 findAll / countAll
- ListUsersService 呼叫改版後的 repository 介面
- 既有測試全部通過（測試本身只需微調呼叫方式）
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/Modules/Auth/Domain/Repositories/IAuthRepository.ts
@src/Modules/Auth/Infrastructure/Repositories/AuthRepository.ts
@src/Modules/Auth/Application/Services/ListUsersService.ts
@src/Modules/Auth/Application/DTOs/UserListDTO.ts
@src/Modules/Auth/__tests__/ListUsersService.test.ts
@src/Shared/Infrastructure/IDatabaseAccess.ts

<interfaces>
<!-- IQueryBuilder (已存在，可直接使用) -->
IQueryBuilder 支援：
  .where(column, operator, value): IQueryBuilder   // 可疊加多個
  .orderBy(column, 'ASC' | 'DESC'): IQueryBuilder
  .limit(n): IQueryBuilder
  .offset(n): IQueryBuilder
  .select(): Promise<Record<string, unknown>[]>
  .count(): Promise<number>

<!-- UserStatus enum（DB column 值） -->
UserStatus.ACTIVE    = 'active'
UserStatus.SUSPENDED = 'suspended'

<!-- Role DB column 值 -->
role 欄位儲存字串（'admin', 'member' 等），對應 Role value object
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1：更新 IAuthRepository 介面，新增 UserListFilters 與 countAll()</name>
  <files>
    src/Modules/Auth/Domain/Repositories/IAuthRepository.ts
  </files>
  <behavior>
    - UserListFilters 型別包含 role?: string、status?: string、limit?: number、offset?: number
    - findAll(filters?: UserListFilters): Promise&lt;User[]&gt;（取代原本 limit?, offset? 簽名）
    - countAll(filters?: UserListFilters): Promise&lt;number&gt;（新增，只計符合 role/status 篩選的總數）
    - 測試（在既有 ListUsersService.test.ts 的 beforeEach 中）：
      authRepo.findAll() 不帶參數應回傳所有 3 筆
      authRepo.findAll({ role: 'admin' }) 應回傳 1 筆
      authRepo.countAll({ status: 'suspended' }) 應回傳 1
  </behavior>
  <action>
    在 IAuthRepository.ts 中：

    1. 在 `import` 之後、`export interface IAuthRepository` 之前，新增：
       ```typescript
       /**
        * Filters for narrowing down the user list query at the persistence layer.
        * role and status are pushed to SQL WHERE; limit/offset control pagination.
        */
       export interface UserListFilters {
         readonly role?: string
         readonly status?: string
         readonly limit?: number
         readonly offset?: number
       }
       ```

    2. 將現有的 `findAll(limit?: number, offset?: number): Promise<User[]>` 替換為：
       ```typescript
       /**
        * Retrieves users matching the given filters, ordered by createdAt DESC.
        * role and status are applied as SQL WHERE conditions.
        */
       findAll(filters?: UserListFilters): Promise<User[]>
       ```

    3. 在 `findAll` 後新增：
       ```typescript
       /**
        * Returns the total count of users matching the given role/status filters.
        * Used for server-side pagination metadata.
        */
       countAll(filters?: UserListFilters): Promise<number>
       ```
  </action>
  <verify>
    <automated>cd /Users/carl/Dev/CMG/Draupnir && bunx tsc --noEmit 2>&1 | head -30</automated>
  </verify>
  <done>IAuthRepository 編譯無錯誤，UserListFilters 已匯出，findAll 與 countAll 簽名正確。</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2：實作 AuthRepository.findAll() 與 countAll() 的 DB 篩選</name>
  <files>
    src/Modules/Auth/Infrastructure/Repositories/AuthRepository.ts
  </files>
  <behavior>
    - findAll({ role: 'admin' }) 只回傳 role='admin' 的 row（不撈全表）
    - findAll({ status: 'suspended', limit: 10, offset: 0 }) 只回傳 suspended，且 DB 層 limit/offset
    - findAll() 不帶參數與原本行為相同（全部 + orderBy createdAt DESC）
    - countAll({ role: 'admin' }) 回傳符合 admin 的數量
    - countAll() 回傳全部使用者數量
    - orderBy 固定為 created_at DESC（移除原本在 Service 層的 JS sort）
  </behavior>
  <action>
    重寫 AuthRepository 中的 findAll 與 countAll 方法：

    ```typescript
    async findAll(filters?: UserListFilters): Promise<User[]> {
      let query = this.db.table('users').orderBy('created_at', 'DESC')
      if (filters?.role) query = query.where('role', '=', filters.role)
      if (filters?.status) query = query.where('status', '=', filters.status)
      if (filters?.offset) query = query.offset(filters.offset)
      if (filters?.limit) query = query.limit(filters.limit)
      const rows = await query.select()
      return rows.map((row) => this.mapRowToUser(row))
    }

    async countAll(filters?: UserListFilters): Promise<number> {
      let query = this.db.table('users')
      if (filters?.role) query = query.where('role', '=', filters.role)
      if (filters?.status) query = query.where('status', '=', filters.status)
      return query.count()
    }
    ```

    同時在檔案頂部引入 UserListFilters：
    `import type { UserListFilters } from '../../Domain/Repositories/IAuthRepository'`

    注意：offset=0 在原本 `if (offset)` 會被跳過（0 是 falsy）。改用 `filters?.offset !== undefined`
    以正確處理 offset=0。limit 同理。最終正確寫法：
    ```typescript
    if (filters?.offset !== undefined) query = query.offset(filters.offset)
    if (filters?.limit !== undefined) query = query.limit(filters.limit)
    ```
  </action>
  <verify>
    <automated>cd /Users/carl/Dev/CMG/Draupnir && bun test src/Modules/Auth/__tests__/ListUsersService.test.ts 2>&1</automated>
  </verify>
  <done>ListUsersService 測試全部通過，TypeScript 編譯無錯誤。</done>
</task>

<task type="auto">
  <name>Task 3：重構 ListUsersService，移除 in-memory role/status 過濾與 JS sort</name>
  <files>
    src/Modules/Auth/Application/Services/ListUsersService.ts
    src/Modules/Auth/__tests__/ListUsersService.test.ts
  </files>
  <action>
    重構 ListUsersService.execute()：

    1. 計算 filters 物件（role、status 傳給 repository；limit/offset 也傳給 repository）：
       ```typescript
       const page = request.page ?? 1
       const limit = request.limit ?? 20
       const offset = (page - 1) * limit
       const repoFilters: UserListFilters = {
         role: request.role,
         status: request.status,
       }
       ```

    2. 當無 keyword 時，pagination 完全在 DB 端：
       ```typescript
       const [total, users] = await Promise.all([
         this.authRepository.countAll(repoFilters),
         this.authRepository.findAll({ ...repoFilters, limit, offset }),
       ])
       ```

    3. 當有 keyword 時（需 profile join），先撈符合 role/status 的全部資料再 in-memory 過濾：
       ```typescript
       const allUsers = await this.authRepository.findAll(repoFilters)
       // ... join profiles, filter by keyword, then slice
       ```

    4. 移除原本 `.sort((a, b) => b.createdAt...)` — DB 已 orderBy created_at DESC
    5. 移除原本 `.filter((user) => request.role ? ...)` 與 `.filter((user) => request.status ? ...)`
    6. 匯入 UserListFilters：
       `import type { UserListFilters } from '../../Domain/Repositories/IAuthRepository'`

    測試檔案 (ListUsersService.test.ts)：
    - beforeEach 中有一行 `const users = await authRepo.findAll()` — 不需修改（無參數呼叫仍有效）
    - 其他呼叫方式不變，所有測試應直接通過
  </action>
  <verify>
    <automated>cd /Users/carl/Dev/CMG/Draupnir && bun test src/Modules/Auth/__tests__/ListUsersService.test.ts 2>&1 && bunx tsc --noEmit 2>&1 | head -20</automated>
  </verify>
  <done>
    全部 4 個 ListUsersService 測試通過。
    TypeScript 嚴格模式編譯無錯誤。
    Service 中不再有 .sort() by createdAt 或 .filter() by role/status。
  </done>
</task>

</tasks>

<verification>
最終驗證：

```bash
cd /Users/carl/Dev/CMG/Draupnir
bun test src/Modules/Auth/__tests__/ListUsersService.test.ts
bun test src/Modules/Auth/__tests__/AuthRepository.test.ts
bunx tsc --noEmit
```

預期：所有測試通過，TypeScript 無錯誤。
</verification>

<success_criteria>
- UserListFilters 介面已定義並從 IAuthRepository.ts 匯出
- IAuthRepository.findAll(filters?) 與 countAll(filters?) 簽名正確
- AuthRepository 實作：role/status 篩選使用 .where() 下推至 SQL；orderBy created_at DESC 在 DB 端；limit/offset 在 DB 端
- ListUsersService 中無 in-memory role/status filter、無 JS sort by createdAt
- keyword 篩選仍保留在 Service 層（合理，需要 profile join）
- 全部既有測試通過
</success_criteria>

<output>
完成後建立 `.planning/quick/260413-vsz-listusersservice-iauthrepository-findall/260413-vsz-SUMMARY.md`
</output>
