# Infrastructure Layer 設計指南

## 目錄
1. [Repository 實作](#1-repository-實作)
2. [Row ↔ Aggregate Mapping](#2-row--aggregate-mapping)
3. [舊資料相容性](#3-舊資料相容性)
4. [Token Revocation 模式](#4-token-revocation-模式)

---

## 1. Repository 實作

### 設計規則
- 實作 Domain 層定義的 Interface
- 只依賴 `IDatabaseAccess`，不直接依賴具體 ORM 類別
- 所有 DB 操作封裝在這層，Application 完全不知道 DB 細節

```typescript
// Infrastructure/Repositories/AuthRepository.ts
export class AuthRepository implements IAuthRepository {
  constructor(private readonly db: IDatabaseAccess) {}

  async save(user: User): Promise<void> {
    const existing = await this.db.table('users').where('id', '=', user.id).first()
    if (existing) {
      await this.db.table('users').where('id', '=', user.id).update({
        email: user.emailValue,
        role: user.role.getValue(),
        status: user.status,
        updated_at: new Date().toISOString(),
      })
    } else {
      await this.db.table('users').insert({
        id: user.id,
        email: user.emailValue,
        password: user.password.getHashed(),
        role: user.role.getValue(),
        status: user.status,
        google_id: user.googleId ?? '',
        created_at: user.createdAt.toISOString(),
        updated_at: user.updatedAt.toISOString(),
      })
    }
  }
}
```

### Filter Pushdown 實作

```typescript
async findAll(filters?: UserListFilters): Promise<User[]> {
  let query = this.db.table('users').orderBy('created_at', 'DESC')

  if (filters?.role)   query = query.where('role', '=', filters.role)
  if (filters?.status) query = query.where('status', '=', filters.status)
  if (filters?.offset !== undefined) query = query.offset(filters.offset)
  if (filters?.limit  !== undefined) query = query.limit(filters.limit)

  const rows = await query.select()
  return rows.map(row => this.mapRowToEntity(row))
}

async countAll(filters?: UserListFilters): Promise<number> {
  let query = this.db.table('users')
  if (filters?.role)   query = query.where('role', '=', filters.role)
  if (filters?.status) query = query.where('status', '=', filters.status)
  return query.count()
}
```

---

## 2. Row ↔ Aggregate Mapping

### 規則
- `mapRowToEntity()` 私有方法，在 Repository 內部使用
- 每個欄位做明確型別轉換（不假設 DB 回傳型別）
- 日期統一透過 helper 轉換

```typescript
private mapRowToEntity(row: Record<string, unknown>): User {
  return User.reconstitute({
    id: String(row.id),
    email: new Email(String(row.email)),
    password: Password.fromHashed(String(row.password)),
    role: this.mapRole(row.role),
    status: this.mapStatus(row.status),
    googleId: row.google_id && String(row.google_id).length > 0
                ? String(row.google_id) : null,
    createdAt: this.toDate(row.created_at),
    updatedAt: this.toDate(row.updated_at),
  })
}

private toDate(value: unknown): Date {
  if (value instanceof Date) return value
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value)
    if (!isNaN(d.getTime())) return d
  }
  return new Date()
}
```

---

## 3. 舊資料相容性

當 DB 存在歷史遺留的值（如舊 role 名稱），**相容邏輯寫在 Repository，不洩漏至 Application**：

```typescript
private mapRole(role: unknown): Role {
  // 舊資料可能有 'user' 或 'guest'，映射為新 canonical 'member'
  if (role === 'user' || role === 'guest') return Role.member()
  if (typeof role === 'string') {
    try { return new Role(role) }
    catch { return Role.member() }  // fallback
  }
  return Role.member()
}
```

**原則**：Application 層只看到新的 canonical 值（`admin`/`manager`/`member`），
歷史相容由 Infrastructure 吸收。

---

## 4. Token Revocation 模式

```typescript
// 存 hash，不存明文 token（防止 DB 洩露）
async save(record: TokenRecord): Promise<void> {
  await this.db.table('auth_tokens').insert({
    id: record.id,
    user_id: record.userId,
    token_hash: record.tokenHash,  // SHA-256(token)
    type: record.type,
    expires_at: record.expiresAt.toISOString(),
    revoked_at: record.revokedAt?.toISOString() ?? null,
    created_at: record.createdAt.toISOString(),
  })
}

// Fail-closed：不在 DB = 已撤銷（安全優先）
async isRevoked(tokenHash: string): Promise<boolean> {
  const record = await this.findByHash(tokenHash)
  if (!record) return true  // 不存在視為已撤銷
  return record.revokedAt !== undefined
}
```
