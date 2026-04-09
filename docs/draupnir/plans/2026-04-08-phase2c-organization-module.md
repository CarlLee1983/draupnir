# Phase 2C: Organization 模組 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立 Organization 多租戶模組 — 組織 CRUD、成員管理、邀請機制

**Architecture:** 獨立 Organization 模組，依賴 Auth（使用者驗證、角色）和 User（Profile 查詢）模組。使用者與組織為一對一關係（user_id UNIQUE）。邀請連結帶 token，支援未註冊者導向註冊流程。

**Tech Stack:** Bun, TypeScript, Vitest, Gravito DDD Framework

**前置條件：** Phase 2A（Auth 補完）和 Phase 2B（User 模組）已完成

---

## File Structure

### 新建檔案
- `src/Modules/Organization/Domain/Aggregates/Organization.ts`
- `src/Modules/Organization/Domain/Entities/OrganizationMember.ts`
- `src/Modules/Organization/Domain/Entities/OrganizationInvitation.ts`
- `src/Modules/Organization/Domain/ValueObjects/OrgSlug.ts`
- `src/Modules/Organization/Domain/ValueObjects/OrgMemberRole.ts`
- `src/Modules/Organization/Domain/ValueObjects/InvitationStatus.ts`
- `src/Modules/Organization/Domain/Repositories/IOrganizationRepository.ts`
- `src/Modules/Organization/Domain/Repositories/IOrganizationMemberRepository.ts`
- `src/Modules/Organization/Domain/Repositories/IOrganizationInvitationRepository.ts`
- `src/Modules/Organization/Application/DTOs/OrganizationDTO.ts`
- `src/Modules/Organization/Application/Services/OrgAuthorizationHelper.ts` — 租戶隔離授權檢查
- `src/Modules/Organization/Application/Services/CreateOrganizationService.ts`
- `src/Modules/Organization/Application/Services/UpdateOrganizationService.ts`
- `src/Modules/Organization/Application/Services/ListOrganizationsService.ts`
- `src/Modules/Organization/Application/Services/InviteMemberService.ts`
- `src/Modules/Organization/Application/Services/AcceptInvitationService.ts`
- `src/Modules/Organization/Application/Services/RemoveMemberService.ts`
- `src/Modules/Organization/Application/Services/ListMembersService.ts`
- `src/Modules/Organization/Application/Services/ChangeOrgMemberRoleService.ts`
- `src/Modules/Organization/Infrastructure/Repositories/OrganizationRepository.ts`
- `src/Modules/Organization/Infrastructure/Repositories/OrganizationMemberRepository.ts`
- `src/Modules/Organization/Infrastructure/Repositories/OrganizationInvitationRepository.ts`
- `src/Modules/Organization/Infrastructure/Providers/OrganizationServiceProvider.ts`
- `src/Modules/Organization/Presentation/Controllers/OrganizationController.ts`
- `src/Modules/Organization/Presentation/Routes/organization.routes.ts`
- `src/Modules/Organization/index.ts`
- `src/Modules/Organization/__tests__/Organization.test.ts`
- `src/Modules/Organization/__tests__/OrgSlug.test.ts`
- `src/Modules/Organization/__tests__/CreateOrganizationService.test.ts`
- `src/Modules/Organization/__tests__/InviteMemberService.test.ts`
- `src/Modules/Organization/__tests__/AcceptInvitationService.test.ts`
- `src/Modules/Organization/__tests__/RemoveMemberService.test.ts`

### 修改檔案
- `src/bootstrap.ts` — 註冊 OrganizationServiceProvider
- `src/routes.ts` — 註冊 Organization 路由
- `src/wiring/index.ts` — 新增 registerOrganization

---

### Task 1: Organization Domain — Value Objects

**Files:**
- Create: `src/Modules/Organization/Domain/ValueObjects/OrgSlug.ts`
- Create: `src/Modules/Organization/Domain/ValueObjects/OrgMemberRole.ts`
- Create: `src/Modules/Organization/Domain/ValueObjects/InvitationStatus.ts`
- Test: `src/Modules/Organization/__tests__/OrgSlug.test.ts`

- [ ] **Step 1: 寫 OrgSlug 測試**

```typescript
// src/Modules/Organization/__tests__/OrgSlug.test.ts
import { describe, it, expect } from 'vitest'
import { OrgSlug } from '../Domain/ValueObjects/OrgSlug'

describe('OrgSlug Value Object', () => {
  it('應接受有效的 slug', () => {
    const slug = new OrgSlug('my-org-123')
    expect(slug.getValue()).toBe('my-org-123')
  })

  it('應自動轉換為小寫', () => {
    const slug = new OrgSlug('My-Org')
    expect(slug.getValue()).toBe('my-org')
  })

  it('應從名稱自動產生 slug', () => {
    const slug = OrgSlug.fromName('My Organization')
    expect(slug.getValue()).toBe('my-organization')
  })

  it('應從名稱移除特殊字元', () => {
    const slug = OrgSlug.fromName('CMG 科技公司 #1')
    expect(slug.getValue()).toMatch(/^[a-z0-9\-]+$/)
  })

  it('應拒絕空 slug', () => {
    expect(() => new OrgSlug('')).toThrow()
  })

  it('應拒絕含有非法字元的 slug', () => {
    expect(() => new OrgSlug('my org!')).toThrow()
  })

  it('應拒絕超過 100 字元的 slug', () => {
    expect(() => new OrgSlug('a'.repeat(101))).toThrow()
  })
})
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `bun test src/Modules/Organization/__tests__/OrgSlug.test.ts`
Expected: FAIL

- [ ] **Step 3: 實作 OrgSlug**

```typescript
// src/Modules/Organization/Domain/ValueObjects/OrgSlug.ts
export class OrgSlug {
  private readonly value: string

  constructor(slug: string) {
    const normalized = slug.toLowerCase().trim()
    if (!this.isValid(normalized)) {
      throw new Error(`無效的組織 slug: ${slug}，僅允許小寫字母、數字和連字號`)
    }
    this.value = normalized
  }

  static fromName(name: string): OrgSlug {
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')  // 移除特殊字元
      .replace(/\s+/g, '-')      // 空格轉連字號
      .replace(/-+/g, '-')       // 合併連續連字號
      .replace(/^-|-$/g, '')     // 移除首尾連字號
    return new OrgSlug(slug || 'org')
  }

  private isValid(slug: string): boolean {
    if (!slug || slug.length === 0) return false
    if (slug.length > 100) return false
    return /^[a-z0-9][a-z0-9\-]*[a-z0-9]$|^[a-z0-9]$/.test(slug)
  }

  getValue(): string {
    return this.value
  }

  equals(other: OrgSlug): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }
}
```

- [ ] **Step 4: 實作 OrgMemberRole**

```typescript
// src/Modules/Organization/Domain/ValueObjects/OrgMemberRole.ts
export enum OrgMemberRoleType {
  MANAGER = 'manager',
  MEMBER = 'member',
}

export class OrgMemberRole {
  private readonly value: OrgMemberRoleType

  constructor(role: string) {
    if (!Object.values(OrgMemberRoleType).includes(role as OrgMemberRoleType)) {
      throw new Error(`無效的組織成員角色: ${role}`)
    }
    this.value = role as OrgMemberRoleType
  }

  getValue(): OrgMemberRoleType {
    return this.value
  }

  isManager(): boolean {
    return this.value === OrgMemberRoleType.MANAGER
  }

  equals(other: OrgMemberRole): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }
}
```

- [ ] **Step 5: 實作 InvitationStatus**

```typescript
// src/Modules/Organization/Domain/ValueObjects/InvitationStatus.ts
export enum InvitationStatusType {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

export class InvitationStatus {
  private readonly value: InvitationStatusType

  constructor(status: string) {
    if (!Object.values(InvitationStatusType).includes(status as InvitationStatusType)) {
      throw new Error(`無效的邀請狀態: ${status}`)
    }
    this.value = status as InvitationStatusType
  }

  getValue(): InvitationStatusType {
    return this.value
  }

  isPending(): boolean {
    return this.value === InvitationStatusType.PENDING
  }

  isAccepted(): boolean {
    return this.value === InvitationStatusType.ACCEPTED
  }

  toString(): string {
    return this.value
  }
}
```

- [ ] **Step 6: 執行測試確認通過**

Run: `bun test src/Modules/Organization/__tests__/OrgSlug.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/Modules/Organization/Domain/ValueObjects/
git commit -m "feat: [org] 新增 OrgSlug、OrgMemberRole、InvitationStatus Value Objects"
```

---

### Task 2: Organization Aggregate 和 Entities

**Files:**
- Create: `src/Modules/Organization/Domain/Aggregates/Organization.ts`
- Create: `src/Modules/Organization/Domain/Entities/OrganizationMember.ts`
- Create: `src/Modules/Organization/Domain/Entities/OrganizationInvitation.ts`
- Test: `src/Modules/Organization/__tests__/Organization.test.ts`

- [ ] **Step 1: 寫 Organization 測試**

```typescript
// src/Modules/Organization/__tests__/Organization.test.ts
import { describe, it, expect } from 'vitest'
import { Organization } from '../Domain/Aggregates/Organization'
import { OrganizationMember } from '../Domain/Entities/OrganizationMember'
import { OrganizationInvitation } from '../Domain/Entities/OrganizationInvitation'

describe('Organization Aggregate', () => {
  it('應成功建立 Organization', () => {
    const org = Organization.create('org-1', 'CMG 科技', '公司描述')
    expect(org.id).toBe('org-1')
    expect(org.name).toBe('CMG 科技')
    expect(org.slug).toMatch(/^[a-z0-9\-]+$/)
    expect(org.status).toBe('active')
  })

  it('update 應回傳新物件', () => {
    const org = Organization.create('org-1', 'CMG 科技', '舊描述')
    const updated = org.update({ description: '新描述' })
    expect(updated.description).toBe('新描述')
    expect(org.description).toBe('舊描述')
  })

  it('suspend 和 activate 應正確切換狀態', () => {
    const org = Organization.create('org-1', 'CMG', '')
    const suspended = org.suspend()
    expect(suspended.status).toBe('suspended')
    const activated = suspended.activate()
    expect(activated.status).toBe('active')
  })
})

describe('OrganizationMember Entity', () => {
  it('應成功建立成員', () => {
    const member = OrganizationMember.create('m-1', 'org-1', 'user-1', 'manager')
    expect(member.organizationId).toBe('org-1')
    expect(member.userId).toBe('user-1')
    expect(member.role).toBe('manager')
  })
})

describe('OrganizationInvitation Entity', () => {
  it('應成功建立邀請', () => {
    const invitation = OrganizationInvitation.create('org-1', 'new@example.com', 'member', 'inviter-1')
    expect(invitation.organizationId).toBe('org-1')
    expect(invitation.email).toBe('new@example.com')
    expect(invitation.status).toBe('pending')
    expect(invitation.token).toBeTruthy()
    expect(invitation.isExpired()).toBe(false)
  })

  it('getTokenHash 應回傳 SHA-256', () => {
    const invitation = OrganizationInvitation.create('org-1', 'new@example.com', 'member', 'inviter-1')
    expect(invitation.getTokenHash()).toMatch(/^[a-f0-9]{64}$/)
  })
})
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `bun test src/Modules/Organization/__tests__/Organization.test.ts`
Expected: FAIL

- [ ] **Step 3: 實作 Organization Aggregate**

```typescript
// src/Modules/Organization/Domain/Aggregates/Organization.ts
import { OrgSlug } from '../ValueObjects/OrgSlug'

interface OrganizationProps {
  id: string
  name: string
  slug: string
  description: string
  status: 'active' | 'suspended'
  createdAt: Date
  updatedAt: Date
}

export interface UpdateOrganizationFields {
  name?: string
  description?: string
}

export class Organization {
  private readonly props: OrganizationProps

  private constructor(props: OrganizationProps) {
    this.props = props
  }

  static create(id: string, name: string, description: string, slug?: string): Organization {
    const orgSlug = slug ? new OrgSlug(slug) : OrgSlug.fromName(name)
    return new Organization({
      id,
      name,
      slug: orgSlug.getValue(),
      description,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  static fromDatabase(row: Record<string, unknown>): Organization {
    return new Organization({
      id: row.id as string,
      name: row.name as string,
      slug: row.slug as string,
      description: (row.description as string) || '',
      status: row.status as 'active' | 'suspended',
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    })
  }

  update(fields: UpdateOrganizationFields): Organization {
    return new Organization({
      ...this.props,
      ...(fields.name !== undefined && { name: fields.name }),
      ...(fields.description !== undefined && { description: fields.description }),
      updatedAt: new Date(),
    })
  }

  suspend(): Organization {
    return new Organization({ ...this.props, status: 'suspended', updatedAt: new Date() })
  }

  activate(): Organization {
    return new Organization({ ...this.props, status: 'active', updatedAt: new Date() })
  }

  get id(): string { return this.props.id }
  get name(): string { return this.props.name }
  get slug(): string { return this.props.slug }
  get description(): string { return this.props.description }
  get status(): string { return this.props.status }
  get createdAt(): Date { return this.props.createdAt }
  get updatedAt(): Date { return this.props.updatedAt }

  toDatabaseRow(): Record<string, unknown> {
    return {
      id: this.props.id,
      name: this.props.name,
      slug: this.props.slug,
      description: this.props.description,
      status: this.props.status,
      created_at: this.props.createdAt.toISOString(),
      updated_at: this.props.updatedAt.toISOString(),
    }
  }

  toDTO(): Record<string, unknown> {
    return {
      id: this.props.id,
      name: this.props.name,
      slug: this.props.slug,
      description: this.props.description,
      status: this.props.status,
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString(),
    }
  }
}
```

- [ ] **Step 4: 實作 OrganizationMember Entity**

```typescript
// src/Modules/Organization/Domain/Entities/OrganizationMember.ts
interface OrganizationMemberProps {
  id: string
  organizationId: string
  userId: string
  role: string
  joinedAt: Date
  createdAt: Date
}

export class OrganizationMember {
  private readonly props: OrganizationMemberProps

  private constructor(props: OrganizationMemberProps) {
    this.props = props
  }

  static create(id: string, organizationId: string, userId: string, role: string): OrganizationMember {
    return new OrganizationMember({
      id,
      organizationId,
      userId,
      role,
      joinedAt: new Date(),
      createdAt: new Date(),
    })
  }

  static fromDatabase(row: Record<string, unknown>): OrganizationMember {
    return new OrganizationMember({
      id: row.id as string,
      organizationId: row.organization_id as string,
      userId: row.user_id as string,
      role: row.role as string,
      joinedAt: new Date(row.joined_at as string),
      createdAt: new Date(row.created_at as string),
    })
  }

  changeRole(newRole: string): OrganizationMember {
    return new OrganizationMember({ ...this.props, role: newRole })
  }

  get id(): string { return this.props.id }
  get organizationId(): string { return this.props.organizationId }
  get userId(): string { return this.props.userId }
  get role(): string { return this.props.role }
  get joinedAt(): Date { return this.props.joinedAt }
  get createdAt(): Date { return this.props.createdAt }

  isManager(): boolean { return this.props.role === 'manager' }

  toDatabaseRow(): Record<string, unknown> {
    return {
      id: this.props.id,
      organization_id: this.props.organizationId,
      user_id: this.props.userId,
      role: this.props.role,
      joined_at: this.props.joinedAt.toISOString(),
      created_at: this.props.createdAt.toISOString(),
    }
  }

  toDTO(): Record<string, unknown> {
    return {
      id: this.props.id,
      organizationId: this.props.organizationId,
      userId: this.props.userId,
      role: this.props.role,
      joinedAt: this.props.joinedAt.toISOString(),
    }
  }
}
```

- [ ] **Step 5: 實作 OrganizationInvitation Entity**

```typescript
// src/Modules/Organization/Domain/Entities/OrganizationInvitation.ts
import { randomBytes, createHash } from 'crypto'
import { v4 as uuidv4 } from 'uuid'

const EXPIRY_DAYS = 7

interface OrganizationInvitationProps {
  id: string
  organizationId: string
  email: string
  token: string
  tokenHash: string
  role: string
  invitedByUserId: string
  status: string
  expiresAt: Date
  createdAt: Date
}

export class OrganizationInvitation {
  private readonly props: OrganizationInvitationProps

  private constructor(props: OrganizationInvitationProps) {
    this.props = props
  }

  static create(organizationId: string, email: string, role: string, invitedByUserId: string): OrganizationInvitation {
    const token = randomBytes(32).toString('hex')
    const tokenHash = createHash('sha256').update(token).digest('hex')
    return new OrganizationInvitation({
      id: uuidv4(),
      organizationId,
      email: email.toLowerCase(),
      token,
      tokenHash,
      role,
      invitedByUserId,
      status: 'pending',
      expiresAt: new Date(Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    })
  }

  static fromDatabase(row: Record<string, unknown>): OrganizationInvitation {
    return new OrganizationInvitation({
      id: row.id as string,
      organizationId: row.organization_id as string,
      email: row.email as string,
      token: '',
      tokenHash: row.token_hash as string,
      role: row.role as string,
      invitedByUserId: row.invited_by_user_id as string,
      status: row.status as string,
      expiresAt: new Date(row.expires_at as string),
      createdAt: new Date(row.created_at as string),
    })
  }

  get id(): string { return this.props.id }
  get organizationId(): string { return this.props.organizationId }
  get email(): string { return this.props.email }
  get token(): string { return this.props.token }
  get role(): string { return this.props.role }
  get invitedByUserId(): string { return this.props.invitedByUserId }
  get status(): string { return this.props.status }
  get expiresAt(): Date { return this.props.expiresAt }
  get createdAt(): Date { return this.props.createdAt }

  getTokenHash(): string { return this.props.tokenHash }

  isExpired(): boolean {
    return new Date() > this.props.expiresAt
  }

  isPending(): boolean {
    return this.props.status === 'pending' && !this.isExpired()
  }

  markAsAccepted(): OrganizationInvitation {
    return new OrganizationInvitation({ ...this.props, status: 'accepted' })
  }

  cancel(): OrganizationInvitation {
    return new OrganizationInvitation({ ...this.props, status: 'cancelled' })
  }

  toDatabaseRow(): Record<string, unknown> {
    return {
      id: this.props.id,
      organization_id: this.props.organizationId,
      email: this.props.email,
      token_hash: this.props.tokenHash,
      role: this.props.role,
      invited_by_user_id: this.props.invitedByUserId,
      status: this.props.status,
      expires_at: this.props.expiresAt.toISOString(),
      created_at: this.props.createdAt.toISOString(),
    }
  }

  toDTO(): Record<string, unknown> {
    return {
      id: this.props.id,
      organizationId: this.props.organizationId,
      email: this.props.email,
      role: this.props.role,
      status: this.props.status,
      expiresAt: this.props.expiresAt.toISOString(),
      createdAt: this.props.createdAt.toISOString(),
    }
  }
}
```

- [ ] **Step 6: 執行測試確認通過**

Run: `bun test src/Modules/Organization/__tests__/Organization.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/Modules/Organization/Domain/ src/Modules/Organization/__tests__/Organization.test.ts src/Modules/Organization/__tests__/OrgSlug.test.ts
git commit -m "feat: [org] 新增 Organization Aggregate、Member/Invitation Entities、Value Objects"
```

---

### Task 3: Repository 介面和實作 + DTO

**Files:**
- Create: `src/Modules/Organization/Domain/Repositories/IOrganizationRepository.ts`
- Create: `src/Modules/Organization/Domain/Repositories/IOrganizationMemberRepository.ts`
- Create: `src/Modules/Organization/Domain/Repositories/IOrganizationInvitationRepository.ts`
- Create: `src/Modules/Organization/Infrastructure/Repositories/OrganizationRepository.ts`
- Create: `src/Modules/Organization/Infrastructure/Repositories/OrganizationMemberRepository.ts`
- Create: `src/Modules/Organization/Infrastructure/Repositories/OrganizationInvitationRepository.ts`
- Create: `src/Modules/Organization/Application/DTOs/OrganizationDTO.ts`

- [ ] **Step 1: 建立三個 Repository 介面**

```typescript
// src/Modules/Organization/Domain/Repositories/IOrganizationRepository.ts
import type { Organization } from '../Aggregates/Organization'

export interface IOrganizationRepository {
  findById(id: string): Promise<Organization | null>
  findBySlug(slug: string): Promise<Organization | null>
  save(org: Organization): Promise<void>
  update(org: Organization): Promise<void>
  findAll(limit?: number, offset?: number): Promise<Organization[]>
  count(): Promise<number>
}
```

```typescript
// src/Modules/Organization/Domain/Repositories/IOrganizationMemberRepository.ts
import type { OrganizationMember } from '../Entities/OrganizationMember'

export interface IOrganizationMemberRepository {
  findByUserId(userId: string): Promise<OrganizationMember | null>
  findByOrgId(orgId: string, limit?: number, offset?: number): Promise<OrganizationMember[]>
  save(member: OrganizationMember): Promise<void>
  remove(memberId: string): Promise<void>
  countByOrgId(orgId: string): Promise<number>
  countManagersByOrgId(orgId: string): Promise<number>
  update(member: OrganizationMember): Promise<void>
}
```

```typescript
// src/Modules/Organization/Domain/Repositories/IOrganizationInvitationRepository.ts
import type { OrganizationInvitation } from '../Entities/OrganizationInvitation'

export interface IOrganizationInvitationRepository {
  save(invitation: OrganizationInvitation): Promise<void>
  findByTokenHash(tokenHash: string): Promise<OrganizationInvitation | null>
  findByOrgId(orgId: string): Promise<OrganizationInvitation[]>
  markAsAccepted(invitationId: string): Promise<void>
  cancel(invitationId: string): Promise<void>
  deleteExpired(): Promise<void>
}
```

- [ ] **Step 2: 建立三個 Repository 實作**

```typescript
// src/Modules/Organization/Infrastructure/Repositories/OrganizationRepository.ts
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { IOrganizationRepository } from '../../Domain/Repositories/IOrganizationRepository'
import { Organization } from '../../Domain/Aggregates/Organization'

export class OrganizationRepository implements IOrganizationRepository {
  constructor(private readonly db: IDatabaseAccess) {}

  async findById(id: string): Promise<Organization | null> {
    const row = await this.db.table('organizations').where('id', '=', id).first()
    return row ? Organization.fromDatabase(row) : null
  }

  async findBySlug(slug: string): Promise<Organization | null> {
    const row = await this.db.table('organizations').where('slug', '=', slug).first()
    return row ? Organization.fromDatabase(row) : null
  }

  async save(org: Organization): Promise<void> {
    await this.db.table('organizations').insert(org.toDatabaseRow())
  }

  async update(org: Organization): Promise<void> {
    await this.db.table('organizations').where('id', '=', org.id).update(org.toDatabaseRow())
  }

  async findAll(limit?: number, offset?: number): Promise<Organization[]> {
    let query = this.db.table('organizations').orderBy('created_at', 'DESC')
    if (offset) query = query.offset(offset)
    if (limit) query = query.limit(limit)
    const rows = await query.select()
    return rows.map((row) => Organization.fromDatabase(row))
  }

  async count(): Promise<number> {
    return this.db.table('organizations').count()
  }
}
```

```typescript
// src/Modules/Organization/Infrastructure/Repositories/OrganizationMemberRepository.ts
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { IOrganizationMemberRepository } from '../../Domain/Repositories/IOrganizationMemberRepository'
import { OrganizationMember } from '../../Domain/Entities/OrganizationMember'

export class OrganizationMemberRepository implements IOrganizationMemberRepository {
  constructor(private readonly db: IDatabaseAccess) {}

  async findByUserId(userId: string): Promise<OrganizationMember | null> {
    const row = await this.db.table('organization_members').where('user_id', '=', userId).first()
    return row ? OrganizationMember.fromDatabase(row) : null
  }

  async findByOrgId(orgId: string, limit?: number, offset?: number): Promise<OrganizationMember[]> {
    let query = this.db.table('organization_members').where('organization_id', '=', orgId)
    if (offset) query = query.offset(offset)
    if (limit) query = query.limit(limit)
    const rows = await query.select()
    return rows.map((row) => OrganizationMember.fromDatabase(row))
  }

  async save(member: OrganizationMember): Promise<void> {
    await this.db.table('organization_members').insert(member.toDatabaseRow())
  }

  async remove(memberId: string): Promise<void> {
    await this.db.table('organization_members').where('id', '=', memberId).delete()
  }

  async countByOrgId(orgId: string): Promise<number> {
    return this.db.table('organization_members').where('organization_id', '=', orgId).count()
  }

  async countManagersByOrgId(orgId: string): Promise<number> {
    return this.db.table('organization_members')
      .where('organization_id', '=', orgId)
      .where('role', '=', 'manager')
      .count()
  }

  async update(member: OrganizationMember): Promise<void> {
    await this.db.table('organization_members').where('id', '=', member.id).update(member.toDatabaseRow())
  }
}
```

```typescript
// src/Modules/Organization/Infrastructure/Repositories/OrganizationInvitationRepository.ts
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { IOrganizationInvitationRepository } from '../../Domain/Repositories/IOrganizationInvitationRepository'
import { OrganizationInvitation } from '../../Domain/Entities/OrganizationInvitation'

export class OrganizationInvitationRepository implements IOrganizationInvitationRepository {
  constructor(private readonly db: IDatabaseAccess) {}

  async save(invitation: OrganizationInvitation): Promise<void> {
    await this.db.table('organization_invitations').insert(invitation.toDatabaseRow())
  }

  async findByTokenHash(tokenHash: string): Promise<OrganizationInvitation | null> {
    const row = await this.db.table('organization_invitations').where('token_hash', '=', tokenHash).first()
    return row ? OrganizationInvitation.fromDatabase(row) : null
  }

  async findByOrgId(orgId: string): Promise<OrganizationInvitation[]> {
    const rows = await this.db.table('organization_invitations')
      .where('organization_id', '=', orgId)
      .orderBy('created_at', 'DESC')
      .select()
    return rows.map((row) => OrganizationInvitation.fromDatabase(row))
  }

  async markAsAccepted(invitationId: string): Promise<void> {
    await this.db.table('organization_invitations')
      .where('id', '=', invitationId)
      .update({ status: 'accepted' })
  }

  async cancel(invitationId: string): Promise<void> {
    await this.db.table('organization_invitations')
      .where('id', '=', invitationId)
      .update({ status: 'cancelled' })
  }

  async deleteExpired(): Promise<void> {
    await this.db.table('organization_invitations')
      .where('expires_at', '<', new Date().toISOString())
      .where('status', '=', 'pending')
      .delete()
  }
}
```

- [ ] **Step 3: 建立 OrganizationDTO**

```typescript
// src/Modules/Organization/Application/DTOs/OrganizationDTO.ts
export interface CreateOrganizationRequest {
  name: string
  description?: string
  slug?: string
  managerUserId: string
}

export interface UpdateOrganizationRequest {
  name?: string
  description?: string
}

export interface InviteMemberRequest {
  email: string
  role?: string  // default: 'member'
}

export interface AcceptInvitationRequest {
  token: string
}

export interface OrganizationResponse {
  success: boolean
  message: string
  data?: Record<string, unknown>
  error?: string
}

export interface ListOrganizationsResponse {
  success: boolean
  message: string
  data?: {
    organizations: Record<string, unknown>[]
    meta: { total: number; page: number; limit: number; totalPages: number }
  }
  error?: string
}
```

- [ ] **Step 4: Commit**

```bash
git add src/Modules/Organization/Domain/Repositories/ src/Modules/Organization/Infrastructure/Repositories/ src/Modules/Organization/Application/DTOs/
git commit -m "feat: [org] 新增 Organization Repositories（介面+實作）和 DTO"
```

---

### Task 3.5: OrgAuthorizationHelper — 租戶隔離授權

**Files:**
- Create: `src/Modules/Organization/Application/Services/OrgAuthorizationHelper.ts`

所有 org service 操作前需驗證呼叫者有權操作目標組織。此 helper 提供統一的租戶隔離檢查。

- [ ] **Step 1: 建立 OrgAuthorizationHelper**

```typescript
// src/Modules/Organization/Application/Services/OrgAuthorizationHelper.ts
import type { IOrganizationMemberRepository } from '../../Domain/Repositories/IOrganizationMemberRepository'

export interface OrgAuthResult {
  authorized: boolean
  membership?: { role: string; userId: string }
  error?: string
}

export class OrgAuthorizationHelper {
  constructor(private memberRepository: IOrganizationMemberRepository) {}

  /**
   * 驗證使用者是否為指定組織的成員
   * systemRole 為系統層級角色（如 'admin'），Admin 可跨組織操作
   */
  async requireOrgMembership(
    orgId: string,
    callerUserId: string,
    callerSystemRole: string,
  ): Promise<OrgAuthResult> {
    // 系統 Admin 可操作任何組織
    if (callerSystemRole === 'admin') {
      return { authorized: true }
    }

    const membership = await this.memberRepository.findByUserId(callerUserId)
    if (!membership || membership.organizationId !== orgId) {
      return { authorized: false, error: 'NOT_ORG_MEMBER' }
    }

    return {
      authorized: true,
      membership: { role: membership.role, userId: membership.userId },
    }
  }

  /**
   * 驗證使用者是否為指定組織的 Manager（或系統 Admin）
   */
  async requireOrgManager(
    orgId: string,
    callerUserId: string,
    callerSystemRole: string,
  ): Promise<OrgAuthResult> {
    if (callerSystemRole === 'admin') {
      return { authorized: true }
    }

    const membership = await this.memberRepository.findByUserId(callerUserId)
    if (!membership || membership.organizationId !== orgId) {
      return { authorized: false, error: 'NOT_ORG_MEMBER' }
    }

    if (!membership.isManager()) {
      return { authorized: false, error: 'NOT_ORG_MANAGER' }
    }

    return {
      authorized: true,
      membership: { role: membership.role, userId: membership.userId },
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/Modules/Organization/Application/Services/OrgAuthorizationHelper.ts
git commit -m "feat: [org] 新增 OrgAuthorizationHelper 租戶隔離授權"
```

---

### Task 4: CreateOrganizationService

**Files:**
- Create: `src/Modules/Organization/Application/Services/CreateOrganizationService.ts`
- Test: `src/Modules/Organization/__tests__/CreateOrganizationService.test.ts`

- [ ] **Step 1: 寫測試**

```typescript
// src/Modules/Organization/__tests__/CreateOrganizationService.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { CreateOrganizationService } from '../Application/Services/CreateOrganizationService'
import { OrganizationRepository } from '../Infrastructure/Repositories/OrganizationRepository'
import { OrganizationMemberRepository } from '../Infrastructure/Repositories/OrganizationMemberRepository'
import { AuthRepository } from '@/Modules/Auth/Infrastructure/Repositories/AuthRepository'
import { RegisterUserService } from '@/Modules/Auth/Application/Services/RegisterUserService'

describe('CreateOrganizationService', () => {
  let service: CreateOrganizationService
  let db: MemoryDatabaseAccess
  let managerId: string

  beforeEach(async () => {
    db = new MemoryDatabaseAccess()
    const authRepo = new AuthRepository(db)
    const orgRepo = new OrganizationRepository(db)
    const memberRepo = new OrganizationMemberRepository(db)
    service = new CreateOrganizationService(orgRepo, memberRepo, authRepo)

    // 建立一個使用者作為 Manager
    const registerService = new RegisterUserService(authRepo)
    const result = await registerService.execute({ email: 'manager@example.com', password: 'StrongPass123' })
    managerId = result.data!.id
  })

  it('應成功建立 Organization 並指定 Manager', async () => {
    const result = await service.execute({
      name: 'CMG 科技',
      description: '科技公司',
      managerUserId: managerId,
    })
    expect(result.success).toBe(true)
    expect(result.data?.name).toBe('CMG 科技')
    expect(result.data?.slug).toBeTruthy()
  })

  it('不存在的 Manager 應回傳錯誤', async () => {
    const result = await service.execute({
      name: 'Test Org',
      managerUserId: 'nonexistent',
    })
    expect(result.success).toBe(false)
    expect(result.error).toBe('MANAGER_NOT_FOUND')
  })

  it('空名稱應回傳錯誤', async () => {
    const result = await service.execute({
      name: '',
      managerUserId: managerId,
    })
    expect(result.success).toBe(false)
  })

  it('重複的 slug 應回傳錯誤', async () => {
    await service.execute({ name: 'CMG', managerUserId: managerId })
    // 用相同 slug 再建一次（需要新的 manager）
    const authRepo = new AuthRepository(db)
    const registerService = new RegisterUserService(authRepo)
    const result2 = await registerService.execute({ email: 'manager2@example.com', password: 'StrongPass123' })
    const result = await service.execute({ name: 'CMG', slug: 'cmg', managerUserId: result2.data!.id })
    expect(result.success).toBe(false)
    expect(result.error).toBe('SLUG_EXISTS')
  })
})
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `bun test src/Modules/Organization/__tests__/CreateOrganizationService.test.ts`
Expected: FAIL

- [ ] **Step 3: 實作 CreateOrganizationService**

```typescript
// src/Modules/Organization/Application/Services/CreateOrganizationService.ts
import { v4 as uuidv4 } from 'uuid'
import type { IOrganizationRepository } from '../../Domain/Repositories/IOrganizationRepository'
import type { IOrganizationMemberRepository } from '../../Domain/Repositories/IOrganizationMemberRepository'
import type { IAuthRepository } from '@/Modules/Auth/Domain/Repositories/IAuthRepository'
import { Organization } from '../../Domain/Aggregates/Organization'
import { OrganizationMember } from '../../Domain/Entities/OrganizationMember'
import type { CreateOrganizationRequest, OrganizationResponse } from '../DTOs/OrganizationDTO'

export class CreateOrganizationService {
  constructor(
    private orgRepository: IOrganizationRepository,
    private memberRepository: IOrganizationMemberRepository,
    private authRepository: IAuthRepository,
  ) {}

  async execute(request: CreateOrganizationRequest): Promise<OrganizationResponse> {
    try {
      if (!request.name || !request.name.trim()) {
        return { success: false, message: '組織名稱不能為空', error: 'NAME_REQUIRED' }
      }

      // 驗證 Manager 存在
      const manager = await this.authRepository.findById(request.managerUserId)
      if (!manager) {
        return { success: false, message: '指定的 Manager 不存在', error: 'MANAGER_NOT_FOUND' }
      }

      // 檢查 Manager 是否已屬於其他組織
      const existingMembership = await this.memberRepository.findByUserId(request.managerUserId)
      if (existingMembership) {
        return { success: false, message: '該使用者已屬於其他組織', error: 'USER_ALREADY_IN_ORG' }
      }

      // 建立 Organization
      const orgId = uuidv4()
      const org = Organization.create(orgId, request.name, request.description || '', request.slug)

      // 檢查 slug 唯一性
      const existingSlug = await this.orgRepository.findBySlug(org.slug)
      if (existingSlug) {
        return { success: false, message: '此 slug 已被使用', error: 'SLUG_EXISTS' }
      }

      await this.orgRepository.save(org)

      // 將 Manager 加為成員
      const member = OrganizationMember.create(uuidv4(), orgId, request.managerUserId, 'manager')
      await this.memberRepository.save(member)

      return { success: true, message: '組織建立成功', data: org.toDTO() }
    } catch (error: any) {
      return { success: false, message: error.message || '建立失敗', error: error.message }
    }
  }
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `bun test src/Modules/Organization/__tests__/CreateOrganizationService.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/Modules/Organization/Application/Services/CreateOrganizationService.ts src/Modules/Organization/__tests__/CreateOrganizationService.test.ts
git commit -m "feat: [org] 新增 CreateOrganizationService"
```

---

### Task 5: InviteMemberService

**Files:**
- Create: `src/Modules/Organization/Application/Services/InviteMemberService.ts`
- Test: `src/Modules/Organization/__tests__/InviteMemberService.test.ts`

- [ ] **Step 1: 寫測試**

```typescript
// src/Modules/Organization/__tests__/InviteMemberService.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { InviteMemberService } from '../Application/Services/InviteMemberService'
import { CreateOrganizationService } from '../Application/Services/CreateOrganizationService'
import { OrganizationRepository } from '../Infrastructure/Repositories/OrganizationRepository'
import { OrganizationMemberRepository } from '../Infrastructure/Repositories/OrganizationMemberRepository'
import { OrganizationInvitationRepository } from '../Infrastructure/Repositories/OrganizationInvitationRepository'
import { AuthRepository } from '@/Modules/Auth/Infrastructure/Repositories/AuthRepository'
import { RegisterUserService } from '@/Modules/Auth/Application/Services/RegisterUserService'

describe('InviteMemberService', () => {
  let inviteService: InviteMemberService
  let orgId: string
  let managerId: string

  beforeEach(async () => {
    const db = new MemoryDatabaseAccess()
    const authRepo = new AuthRepository(db)
    const orgRepo = new OrganizationRepository(db)
    const memberRepo = new OrganizationMemberRepository(db)
    const invitationRepo = new OrganizationInvitationRepository(db)

    const createOrgService = new CreateOrganizationService(orgRepo, memberRepo, authRepo)
    inviteService = new InviteMemberService(orgRepo, invitationRepo)

    const registerService = new RegisterUserService(authRepo)
    const userResult = await registerService.execute({ email: 'manager@example.com', password: 'StrongPass123' })
    managerId = userResult.data!.id

    const orgResult = await createOrgService.execute({ name: 'Test Org', managerUserId: managerId })
    orgId = orgResult.data!.id as string
  })

  it('應成功產生邀請連結', async () => {
    const result = await inviteService.execute(orgId, managerId, { email: 'new@example.com' })
    expect(result.success).toBe(true)
    expect(result.data?.token).toBeTruthy()
    expect(result.data?.expiresAt).toBeTruthy()
  })

  it('不存在的組織應回傳錯誤', async () => {
    const result = await inviteService.execute('nonexistent', managerId, { email: 'new@example.com' })
    expect(result.success).toBe(false)
  })

  it('空的 email 應回傳錯誤', async () => {
    const result = await inviteService.execute(orgId, managerId, { email: '' })
    expect(result.success).toBe(false)
  })
})
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `bun test src/Modules/Organization/__tests__/InviteMemberService.test.ts`
Expected: FAIL

- [ ] **Step 3: 實作 InviteMemberService**

```typescript
// src/Modules/Organization/Application/Services/InviteMemberService.ts
import type { IOrganizationRepository } from '../../Domain/Repositories/IOrganizationRepository'
import type { IOrganizationInvitationRepository } from '../../Domain/Repositories/IOrganizationInvitationRepository'
import type { OrgAuthorizationHelper } from './OrgAuthorizationHelper'
import { OrganizationInvitation } from '../../Domain/Entities/OrganizationInvitation'
import type { InviteMemberRequest, OrganizationResponse } from '../DTOs/OrganizationDTO'

export class InviteMemberService {
  constructor(
    private orgRepository: IOrganizationRepository,
    private invitationRepository: IOrganizationInvitationRepository,
    private orgAuth: OrgAuthorizationHelper,
  ) {}

  async execute(orgId: string, invitedByUserId: string, callerSystemRole: string, request: InviteMemberRequest): Promise<OrganizationResponse> {
    try {
      // 租戶隔離：驗證呼叫者是該組織的 Manager 或系統 Admin
      const authResult = await this.orgAuth.requireOrgManager(orgId, invitedByUserId, callerSystemRole)
      if (!authResult.authorized) {
        return { success: false, message: '權限不足', error: authResult.error }
      }

      if (!request.email || !request.email.trim()) {
        return { success: false, message: '電子郵件不能為空', error: 'EMAIL_REQUIRED' }
      }

      const org = await this.orgRepository.findById(orgId)
      if (!org) {
        return { success: false, message: '找不到組織', error: 'ORG_NOT_FOUND' }
      }

      if (org.status === 'suspended') {
        return { success: false, message: '組織已停用', error: 'ORG_SUSPENDED' }
      }

      const role = request.role || 'member'
      const invitation = OrganizationInvitation.create(orgId, request.email, role, invitedByUserId)
      await this.invitationRepository.save(invitation)

      return {
        success: true,
        message: '邀請已發送',
        data: {
          ...invitation.toDTO(),
          token: invitation.token,
          expiresAt: invitation.expiresAt.toISOString(),
        },
      }
    } catch (error: any) {
      return { success: false, message: error.message || '邀請失敗', error: error.message }
    }
  }
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `bun test src/Modules/Organization/__tests__/InviteMemberService.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/Modules/Organization/Application/Services/InviteMemberService.ts src/Modules/Organization/__tests__/InviteMemberService.test.ts
git commit -m "feat: [org] 新增 InviteMemberService"
```

---

### Task 6: AcceptInvitationService

**Files:**
- Create: `src/Modules/Organization/Application/Services/AcceptInvitationService.ts`
- Test: `src/Modules/Organization/__tests__/AcceptInvitationService.test.ts`

- [ ] **Step 1: 寫測試**

```typescript
// src/Modules/Organization/__tests__/AcceptInvitationService.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { AcceptInvitationService } from '../Application/Services/AcceptInvitationService'
import { InviteMemberService } from '../Application/Services/InviteMemberService'
import { CreateOrganizationService } from '../Application/Services/CreateOrganizationService'
import { OrganizationRepository } from '../Infrastructure/Repositories/OrganizationRepository'
import { OrganizationMemberRepository } from '../Infrastructure/Repositories/OrganizationMemberRepository'
import { OrganizationInvitationRepository } from '../Infrastructure/Repositories/OrganizationInvitationRepository'
import { AuthRepository } from '@/Modules/Auth/Infrastructure/Repositories/AuthRepository'
import { RegisterUserService } from '@/Modules/Auth/Application/Services/RegisterUserService'
import { OrgAuthorizationHelper } from '../Application/Services/OrgAuthorizationHelper'

describe('AcceptInvitationService', () => {
  let acceptService: AcceptInvitationService
  let inviteService: InviteMemberService
  let registerService: RegisterUserService
  let orgId: string
  let managerId: string
  let newUserId: string
  let db: MemoryDatabaseAccess

  beforeEach(async () => {
    db = new MemoryDatabaseAccess()
    const authRepo = new AuthRepository(db)
    const orgRepo = new OrganizationRepository(db)
    const memberRepo = new OrganizationMemberRepository(db)
    const invitationRepo = new OrganizationInvitationRepository(db)
    const orgAuth = new OrgAuthorizationHelper(memberRepo)

    registerService = new RegisterUserService(authRepo)
    const createOrgService = new CreateOrganizationService(orgRepo, memberRepo, authRepo)
    inviteService = new InviteMemberService(orgRepo, invitationRepo, orgAuth)
    acceptService = new AcceptInvitationService(invitationRepo, memberRepo, authRepo)

    // 建立 manager 和組織
    const managerResult = await registerService.execute({ email: 'manager@example.com', password: 'StrongPass123' })
    managerId = managerResult.data!.id
    const orgResult = await createOrgService.execute({ name: 'Test Org', managerUserId: managerId })
    orgId = orgResult.data!.id as string

    // 建立被邀請的使用者
    const newUserResult = await registerService.execute({ email: 'new@example.com', password: 'StrongPass123' })
    newUserId = newUserResult.data!.id
  })

  it('已註冊使用者應成功加入組織', async () => {
    const inviteResult = await inviteService.execute(orgId, managerId, 'admin', { email: 'new@example.com' })
    const token = inviteResult.data!.token as string

    const result = await acceptService.execute(newUserId, { token })
    expect(result.success).toBe(true)
  })

  it('已屬於組織的使用者應被拒絕', async () => {
    // manager 已在組織中
    const inviteResult = await inviteService.execute(orgId, managerId, 'admin', { email: 'manager@example.com' })
    const token = inviteResult.data!.token as string

    const result = await acceptService.execute(managerId, { token })
    expect(result.success).toBe(false)
    expect(result.error).toBe('USER_ALREADY_IN_ORG')
  })

  it('email 不匹配的使用者不能接受邀請', async () => {
    // 邀請 new@example.com，但用 other 帳號嘗試接受
    const inviteResult = await inviteService.execute(orgId, managerId, 'admin', { email: 'new@example.com' })
    const token = inviteResult.data!.token as string

    // 建立另一個不同 email 的使用者
    const otherResult = await registerService.execute({ email: 'other@example.com', password: 'StrongPass123' })
    const otherUserId = otherResult.data!.id

    const result = await acceptService.execute(otherUserId, { token })
    expect(result.success).toBe(false)
    expect(result.error).toBe('EMAIL_MISMATCH')
  })

  it('無效 Token 應回傳錯誤', async () => {
    const result = await acceptService.execute(newUserId, { token: 'invalid-token' })
    expect(result.success).toBe(false)
  })
})
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `bun test src/Modules/Organization/__tests__/AcceptInvitationService.test.ts`
Expected: FAIL

- [ ] **Step 3: 實作 AcceptInvitationService**

```typescript
// src/Modules/Organization/Application/Services/AcceptInvitationService.ts
import { createHash } from 'crypto'
import { v4 as uuidv4 } from 'uuid'
import type { IOrganizationInvitationRepository } from '../../Domain/Repositories/IOrganizationInvitationRepository'
import type { IOrganizationMemberRepository } from '../../Domain/Repositories/IOrganizationMemberRepository'
import type { IAuthRepository } from '@/Modules/Auth/Domain/Repositories/IAuthRepository'
import { OrganizationMember } from '../../Domain/Entities/OrganizationMember'
import type { AcceptInvitationRequest, OrganizationResponse } from '../DTOs/OrganizationDTO'

export class AcceptInvitationService {
  constructor(
    private invitationRepository: IOrganizationInvitationRepository,
    private memberRepository: IOrganizationMemberRepository,
    private authRepository: IAuthRepository,
  ) {}

  async execute(userId: string, request: AcceptInvitationRequest): Promise<OrganizationResponse> {
    try {
      if (!request.token || !request.token.trim()) {
        return { success: false, message: 'Token 不能為空', error: 'TOKEN_REQUIRED' }
      }

      // 1. 查找邀請
      const tokenHash = createHash('sha256').update(request.token).digest('hex')
      const invitation = await this.invitationRepository.findByTokenHash(tokenHash)

      if (!invitation || !invitation.isPending()) {
        return { success: false, message: '無效或已過期的邀請', error: 'INVALID_INVITATION' }
      }

      // 2. 驗證使用者存在
      const user = await this.authRepository.findById(userId)
      if (!user) {
        return { success: false, message: '找不到使用者', error: 'USER_NOT_FOUND' }
      }

      // 3. 驗證接受者 email 與邀請 email 一致（防止 token 被他人冒用）
      if (user.emailValue.toLowerCase() !== invitation.email.toLowerCase()) {
        return { success: false, message: '此邀請不是發給您的', error: 'EMAIL_MISMATCH' }
      }

      // 5. 檢查使用者是否已屬於其他組織
      const existingMembership = await this.memberRepository.findByUserId(userId)
      if (existingMembership) {
        return { success: false, message: '您已屬於其他組織', error: 'USER_ALREADY_IN_ORG' }
      }

      // 6. 加入組織
      const member = OrganizationMember.create(
        uuidv4(),
        invitation.organizationId,
        userId,
        invitation.role,
      )
      await this.memberRepository.save(member)

      // 7. 標記邀請為已接受
      await this.invitationRepository.markAsAccepted(invitation.id)

      return {
        success: true,
        message: '已成功加入組織',
        data: member.toDTO(),
      }
    } catch (error: any) {
      return { success: false, message: error.message || '加入失敗', error: error.message }
    }
  }
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `bun test src/Modules/Organization/__tests__/AcceptInvitationService.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/Modules/Organization/Application/Services/AcceptInvitationService.ts src/Modules/Organization/__tests__/AcceptInvitationService.test.ts
git commit -m "feat: [org] 新增 AcceptInvitationService"
```

---

### Task 7: RemoveMemberService 和其餘 Services

**Files:**
- Create: `src/Modules/Organization/Application/Services/RemoveMemberService.ts`
- Create: `src/Modules/Organization/Application/Services/ListMembersService.ts`
- Create: `src/Modules/Organization/Application/Services/ListOrganizationsService.ts`
- Create: `src/Modules/Organization/Application/Services/UpdateOrganizationService.ts`
- Create: `src/Modules/Organization/Application/Services/ChangeOrgMemberRoleService.ts`
- Test: `src/Modules/Organization/__tests__/RemoveMemberService.test.ts`

- [ ] **Step 1: 寫 RemoveMemberService 測試**

```typescript
// src/Modules/Organization/__tests__/RemoveMemberService.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { RemoveMemberService } from '../Application/Services/RemoveMemberService'
import { CreateOrganizationService } from '../Application/Services/CreateOrganizationService'
import { InviteMemberService } from '../Application/Services/InviteMemberService'
import { AcceptInvitationService } from '../Application/Services/AcceptInvitationService'
import { OrganizationRepository } from '../Infrastructure/Repositories/OrganizationRepository'
import { OrganizationMemberRepository } from '../Infrastructure/Repositories/OrganizationMemberRepository'
import { OrganizationInvitationRepository } from '../Infrastructure/Repositories/OrganizationInvitationRepository'
import { AuthRepository } from '@/Modules/Auth/Infrastructure/Repositories/AuthRepository'
import { RegisterUserService } from '@/Modules/Auth/Application/Services/RegisterUserService'

describe('RemoveMemberService', () => {
  let removeService: RemoveMemberService
  let memberRepo: OrganizationMemberRepository
  let orgId: string
  let managerId: string
  let memberId: string

  beforeEach(async () => {
    const db = new MemoryDatabaseAccess()
    const authRepo = new AuthRepository(db)
    const orgRepo = new OrganizationRepository(db)
    memberRepo = new OrganizationMemberRepository(db)
    const invitationRepo = new OrganizationInvitationRepository(db)

    const registerService = new RegisterUserService(authRepo)
    const createOrgService = new CreateOrganizationService(orgRepo, memberRepo, authRepo)
    const inviteService = new InviteMemberService(orgRepo, invitationRepo)
    const acceptService = new AcceptInvitationService(invitationRepo, memberRepo, authRepo)
    removeService = new RemoveMemberService(memberRepo)

    // 建立 manager
    const managerResult = await registerService.execute({ email: 'manager@example.com', password: 'StrongPass123' })
    managerId = managerResult.data!.id

    // 建立組織
    const orgResult = await createOrgService.execute({ name: 'Test Org', managerUserId: managerId })
    orgId = orgResult.data!.id as string

    // 邀請並加入新成員
    const memberResult = await registerService.execute({ email: 'member@example.com', password: 'StrongPass123' })
    memberId = memberResult.data!.id
    const inviteResult = await inviteService.execute(orgId, managerId, { email: 'member@example.com' })
    await acceptService.execute(memberId, { token: inviteResult.data!.token as string })
  })

  it('應成功移除成員', async () => {
    const result = await removeService.execute(orgId, memberId, managerId)
    expect(result.success).toBe(true)
  })

  it('不能移除自己', async () => {
    const result = await removeService.execute(orgId, managerId, managerId)
    expect(result.success).toBe(false)
    expect(result.error).toBe('CANNOT_REMOVE_SELF')
  })

  it('不能移除最後一個 Manager', async () => {
    // manager 是唯一的 manager，但我們不能移除自己（已被上面的測試覆蓋）
    // 這裡測試透過 admin 嘗試移除唯一 manager 的情境
    // 由於 managerId === 唯一 manager，需要從外部（非自己）移除
    // 用不同的 requesterId
    const result = await removeService.execute(orgId, managerId, memberId)
    expect(result.success).toBe(false)
    expect(result.error).toBe('CANNOT_REMOVE_LAST_MANAGER')
  })
})
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `bun test src/Modules/Organization/__tests__/RemoveMemberService.test.ts`
Expected: FAIL

- [ ] **Step 3: 實作 RemoveMemberService**

```typescript
// src/Modules/Organization/Application/Services/RemoveMemberService.ts
import type { IOrganizationMemberRepository } from '../../Domain/Repositories/IOrganizationMemberRepository'
import type { OrgAuthorizationHelper } from './OrgAuthorizationHelper'
import type { OrganizationResponse } from '../DTOs/OrganizationDTO'

export class RemoveMemberService {
  constructor(
    private memberRepository: IOrganizationMemberRepository,
    private orgAuth: OrgAuthorizationHelper,
  ) {}

  async execute(orgId: string, targetUserId: string, requesterId: string, requesterSystemRole: string): Promise<OrganizationResponse> {
    try {
      // 租戶隔離：驗證呼叫者是該組織的 Manager 或系統 Admin
      const authResult = await this.orgAuth.requireOrgManager(orgId, requesterId, requesterSystemRole)
      if (!authResult.authorized) {
        return { success: false, message: '權限不足', error: authResult.error }
      }

      if (targetUserId === requesterId) {
        return { success: false, message: '不能移除自己', error: 'CANNOT_REMOVE_SELF' }
      }

      const member = await this.memberRepository.findByUserId(targetUserId)
      if (!member || member.organizationId !== orgId) {
        return { success: false, message: '找不到成員', error: 'MEMBER_NOT_FOUND' }
      }

      // 檢查是否為最後一個 Manager
      if (member.isManager()) {
        const managerCount = await this.memberRepository.countManagersByOrgId(orgId)
        if (managerCount <= 1) {
          return { success: false, message: '不能移除最後一個 Manager', error: 'CANNOT_REMOVE_LAST_MANAGER' }
        }
      }

      await this.memberRepository.remove(member.id)
      return { success: true, message: '成員已移除' }
    } catch (error: any) {
      return { success: false, message: error.message || '移除失敗', error: error.message }
    }
  }
}
```

- [ ] **Step 4: 實作 ListMembersService**

```typescript
// src/Modules/Organization/Application/Services/ListMembersService.ts
import type { IOrganizationMemberRepository } from '../../Domain/Repositories/IOrganizationMemberRepository'
import type { OrgAuthorizationHelper } from './OrgAuthorizationHelper'
import type { OrganizationResponse } from '../DTOs/OrganizationDTO'

export class ListMembersService {
  constructor(
    private memberRepository: IOrganizationMemberRepository,
    private orgAuth: OrgAuthorizationHelper,
  ) {}

  async execute(orgId: string, callerUserId: string, callerSystemRole: string): Promise<OrganizationResponse> {
    try {
      // 租戶隔離：驗證呼叫者是該組織的成員或系統 Admin
      const authResult = await this.orgAuth.requireOrgMembership(orgId, callerUserId, callerSystemRole)
      if (!authResult.authorized) {
        return { success: false, message: '權限不足', error: authResult.error }
      }

      const members = await this.memberRepository.findByOrgId(orgId)
      return {
        success: true,
        message: '取得成員列表成功',
        data: { members: members.map((m) => m.toDTO()) },
      }
    } catch (error: any) {
      return { success: false, message: error.message || '取得失敗', error: error.message }
    }
  }
}
```

- [ ] **Step 5: 實作 ListOrganizationsService**

```typescript
// src/Modules/Organization/Application/Services/ListOrganizationsService.ts
import type { IOrganizationRepository } from '../../Domain/Repositories/IOrganizationRepository'
import type { ListOrganizationsResponse } from '../DTOs/OrganizationDTO'

export class ListOrganizationsService {
  constructor(private orgRepository: IOrganizationRepository) {}

  async execute(page = 1, limit = 20): Promise<ListOrganizationsResponse> {
    try {
      const offset = (page - 1) * limit
      const [orgs, total] = await Promise.all([
        this.orgRepository.findAll(limit, offset),
        this.orgRepository.count(),
      ])

      return {
        success: true,
        message: '取得組織列表成功',
        data: {
          organizations: orgs.map((o) => o.toDTO()),
          meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        },
      }
    } catch (error: any) {
      return { success: false, message: error.message || '取得失敗', error: error.message }
    }
  }
}
```

- [ ] **Step 6: 實作 UpdateOrganizationService**

```typescript
// src/Modules/Organization/Application/Services/UpdateOrganizationService.ts
import type { IOrganizationRepository } from '../../Domain/Repositories/IOrganizationRepository'
import type { UpdateOrganizationRequest, OrganizationResponse } from '../DTOs/OrganizationDTO'

export class UpdateOrganizationService {
  constructor(private orgRepository: IOrganizationRepository) {}

  async execute(orgId: string, request: UpdateOrganizationRequest): Promise<OrganizationResponse> {
    try {
      const org = await this.orgRepository.findById(orgId)
      if (!org) {
        return { success: false, message: '找不到組織', error: 'ORG_NOT_FOUND' }
      }

      const updated = org.update(request)
      await this.orgRepository.update(updated)

      return { success: true, message: '組織已更新', data: updated.toDTO() }
    } catch (error: any) {
      return { success: false, message: error.message || '更新失敗', error: error.message }
    }
  }
}
```

- [ ] **Step 7: 實作 ChangeOrgMemberRoleService**

```typescript
// src/Modules/Organization/Application/Services/ChangeOrgMemberRoleService.ts
import type { IOrganizationMemberRepository } from '../../Domain/Repositories/IOrganizationMemberRepository'
import { OrgMemberRole } from '../../Domain/ValueObjects/OrgMemberRole'
import type { OrganizationResponse } from '../DTOs/OrganizationDTO'

export class ChangeOrgMemberRoleService {
  constructor(private memberRepository: IOrganizationMemberRepository) {}

  async execute(orgId: string, targetUserId: string, newRole: string): Promise<OrganizationResponse> {
    try {
      // 驗證角色值
      new OrgMemberRole(newRole)

      const member = await this.memberRepository.findByUserId(targetUserId)
      if (!member || member.organizationId !== orgId) {
        return { success: false, message: '找不到成員', error: 'MEMBER_NOT_FOUND' }
      }

      // 如果從 manager 降級，檢查是否為最後一個 manager
      if (member.isManager() && newRole !== 'manager') {
        const managerCount = await this.memberRepository.countManagersByOrgId(orgId)
        if (managerCount <= 1) {
          return { success: false, message: '不能降級最後一個 Manager', error: 'CANNOT_DEMOTE_LAST_MANAGER' }
        }
      }

      const updated = member.changeRole(newRole)
      await this.memberRepository.update(updated)

      return { success: true, message: '成員角色已變更', data: updated.toDTO() }
    } catch (error: any) {
      return { success: false, message: error.message || '變更失敗', error: error.message }
    }
  }
}
```

- [ ] **Step 8: 執行測試確認通過**

Run: `bun test src/Modules/Organization/__tests__/RemoveMemberService.test.ts`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add src/Modules/Organization/Application/Services/
git commit -m "feat: [org] 新增 RemoveMember、ListMembers、ListOrgs、UpdateOrg、ChangeRole 服務"
```

---

### Task 8: Controller、Routes、ServiceProvider、Wiring

**Files:**
- Create: `src/Modules/Organization/Presentation/Controllers/OrganizationController.ts`
- Create: `src/Modules/Organization/Presentation/Routes/organization.routes.ts`
- Create: `src/Modules/Organization/Infrastructure/Providers/OrganizationServiceProvider.ts`
- Create: `src/Modules/Organization/index.ts`
- Modify: `src/bootstrap.ts`
- Modify: `src/routes.ts`
- Modify: `src/wiring/index.ts`

- [ ] **Step 1: 建立 OrganizationController**

```typescript
// src/Modules/Organization/Presentation/Controllers/OrganizationController.ts
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'
import type { CreateOrganizationService } from '../../Application/Services/CreateOrganizationService'
import type { UpdateOrganizationService } from '../../Application/Services/UpdateOrganizationService'
import type { ListOrganizationsService } from '../../Application/Services/ListOrganizationsService'
import type { InviteMemberService } from '../../Application/Services/InviteMemberService'
import type { AcceptInvitationService } from '../../Application/Services/AcceptInvitationService'
import type { RemoveMemberService } from '../../Application/Services/RemoveMemberService'
import type { ListMembersService } from '../../Application/Services/ListMembersService'
import type { ChangeOrgMemberRoleService } from '../../Application/Services/ChangeOrgMemberRoleService'

export class OrganizationController {
  constructor(
    private createOrgService: CreateOrganizationService,
    private updateOrgService: UpdateOrganizationService,
    private listOrgsService: ListOrganizationsService,
    private inviteMemberService: InviteMemberService,
    private acceptInvitationService: AcceptInvitationService,
    private removeMemberService: RemoveMemberService,
    private listMembersService: ListMembersService,
    private changeRoleService: ChangeOrgMemberRoleService,
  ) {}

  async create(ctx: IHttpContext): Promise<Response> {
    const body = await ctx.getJsonBody<{ name: string; description?: string; slug?: string; managerUserId: string }>()
    const result = await this.createOrgService.execute(body)
    return ctx.json(result, result.success ? 201 : 400)
  }

  async list(ctx: IHttpContext): Promise<Response> {
    const page = ctx.getQuery('page') ? Number(ctx.getQuery('page')) : 1
    const limit = ctx.getQuery('limit') ? Number(ctx.getQuery('limit')) : 20
    const result = await this.listOrgsService.execute(page, limit)
    return ctx.json(result, 200)
  }

  async get(ctx: IHttpContext): Promise<Response> {
    // 簡化：直接透過 listOrgsService 或新增 getById
    // 這裡用一個簡單的實作
    const orgId = ctx.getParam('id')
    if (!orgId) return ctx.json({ success: false, message: '缺少 ID' }, 400)
    // TODO: 可抽為獨立 service，此處先用 createOrgService 的 repo
    return ctx.json({ success: false, message: '尚未實作' }, 501)
  }

  async update(ctx: IHttpContext): Promise<Response> {
    const orgId = ctx.getParam('id')
    if (!orgId) return ctx.json({ success: false, message: '缺少 ID' }, 400)
    const body = await ctx.getJsonBody<{ name?: string; description?: string }>()
    const result = await this.updateOrgService.execute(orgId, body)
    return ctx.json(result, result.success ? 200 : 400)
  }

  async changeStatus(ctx: IHttpContext): Promise<Response> {
    // 停用/啟用 — 可整合到 UpdateOrganizationService 或獨立 service
    const orgId = ctx.getParam('id')
    if (!orgId) return ctx.json({ success: false, message: '缺少 ID' }, 400)
    const body = await ctx.getJsonBody<{ status: string }>()
    // 直接用 update service 的 org repo 來做
    return ctx.json({ success: false, message: '尚未實作' }, 501)
  }

  async listMembers(ctx: IHttpContext): Promise<Response> {
    const orgId = ctx.getParam('id')
    if (!orgId) return ctx.json({ success: false, message: '缺少 ID' }, 400)
    const result = await this.listMembersService.execute(orgId)
    return ctx.json(result, 200)
  }

  async invite(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.json({ success: false, message: '未經授權' }, 401)
    const orgId = ctx.getParam('id')
    if (!orgId) return ctx.json({ success: false, message: '缺少 ID' }, 400)
    const body = await ctx.getJsonBody<{ email: string; role?: string }>()
    const result = await this.inviteMemberService.execute(orgId, auth.userId, body)
    return ctx.json(result, result.success ? 201 : 400)
  }

  async acceptInvitation(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.json({ success: false, message: '未經授權' }, 401)
    const token = ctx.getParam('token')
    if (!token) return ctx.json({ success: false, message: '缺少 Token' }, 400)
    const result = await this.acceptInvitationService.execute(auth.userId, { token })
    return ctx.json(result, result.success ? 200 : 400)
  }

  async removeMember(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.json({ success: false, message: '未經授權' }, 401)
    const orgId = ctx.getParam('id')
    const userId = ctx.getParam('userId')
    if (!orgId || !userId) return ctx.json({ success: false, message: '缺少參數' }, 400)
    const result = await this.removeMemberService.execute(orgId, userId, auth.userId)
    return ctx.json(result, result.success ? 200 : 400)
  }

  async changeMemberRole(ctx: IHttpContext): Promise<Response> {
    const orgId = ctx.getParam('id')
    const userId = ctx.getParam('userId')
    if (!orgId || !userId) return ctx.json({ success: false, message: '缺少參數' }, 400)
    const body = await ctx.getJsonBody<{ role: string }>()
    const result = await this.changeRoleService.execute(orgId, userId, body.role)
    return ctx.json(result, result.success ? 200 : 400)
  }

  async listInvitations(ctx: IHttpContext): Promise<Response> {
    // 簡化：回傳組織的所有邀請
    return ctx.json({ success: false, message: '尚未實作' }, 501)
  }

  async cancelInvitation(ctx: IHttpContext): Promise<Response> {
    return ctx.json({ success: false, message: '尚未實作' }, 501)
  }
}
```

注意：以下 4 個端點在此 Task 中先回傳 501，將在 Task 8.5 中補完實作：
- `get` — 透過 ID 取得組織詳情
- `changeStatus` — 停用/啟用組織
- `listInvitations` — 列出組織邀請
- `cancelInvitation` — 取消邀請

- [ ] **Step 2: 建立 organization.routes.ts**

```typescript
// src/Modules/Organization/Presentation/Routes/organization.routes.ts
import type { IModuleRouter } from '@/Shared/Presentation/IModuleRouter'
import type { OrganizationController } from '../Controllers/OrganizationController'
import { requireAuth, createRoleMiddleware } from '@/Modules/Auth/Presentation/Middleware/RoleMiddleware'

export async function registerOrganizationRoutes(
  router: IModuleRouter,
  controller: OrganizationController,
): Promise<void> {
  // Admin 端點
  router.post('/api/organizations', [createRoleMiddleware('admin')], (ctx) => controller.create(ctx))
  router.get('/api/organizations', [createRoleMiddleware('admin')], (ctx) => controller.list(ctx))
  router.get('/api/organizations/:id', [requireAuth()], (ctx) => controller.get(ctx))
  router.put('/api/organizations/:id', [createRoleMiddleware('admin')], (ctx) => controller.update(ctx))
  router.patch('/api/organizations/:id/status', [createRoleMiddleware('admin')], (ctx) => controller.changeStatus(ctx))

  // Manager 端點
  router.get('/api/organizations/:id/members', [createRoleMiddleware('manager')], (ctx) => controller.listMembers(ctx))
  router.post('/api/organizations/:id/invitations', [createRoleMiddleware('manager')], (ctx) => controller.invite(ctx))
  router.get('/api/organizations/:id/invitations', [createRoleMiddleware('manager')], (ctx) => controller.listInvitations(ctx))
  router.delete('/api/organizations/:id/invitations/:invId', [createRoleMiddleware('manager')], (ctx) => controller.cancelInvitation(ctx))

  // 已認證使用者
  router.post('/api/invitations/:token/accept', [requireAuth()], (ctx) => controller.acceptInvitation(ctx))

  // Manager / Admin
  router.delete('/api/organizations/:id/members/:userId', [createRoleMiddleware('manager')], (ctx) => controller.removeMember(ctx))
  router.patch('/api/organizations/:id/members/:userId/role', [createRoleMiddleware('admin')], (ctx) => controller.changeMemberRole(ctx))
}
```

- [ ] **Step 3: 建立 OrganizationServiceProvider**

```typescript
// src/Modules/Organization/Infrastructure/Providers/OrganizationServiceProvider.ts
import { ModuleServiceProvider, type IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { getCurrentDatabaseAccess } from '@/wiring/CurrentDatabaseAccess'
import type { IOrganizationRepository } from '../../Domain/Repositories/IOrganizationRepository'
import type { IOrganizationMemberRepository } from '../../Domain/Repositories/IOrganizationMemberRepository'
import type { IOrganizationInvitationRepository } from '../../Domain/Repositories/IOrganizationInvitationRepository'
import type { IAuthRepository } from '@/Modules/Auth/Domain/Repositories/IAuthRepository'
import { OrganizationRepository } from '../Repositories/OrganizationRepository'
import { OrganizationMemberRepository } from '../Repositories/OrganizationMemberRepository'
import { OrganizationInvitationRepository } from '../Repositories/OrganizationInvitationRepository'
import { CreateOrganizationService } from '../../Application/Services/CreateOrganizationService'
import { UpdateOrganizationService } from '../../Application/Services/UpdateOrganizationService'
import { ListOrganizationsService } from '../../Application/Services/ListOrganizationsService'
import { InviteMemberService } from '../../Application/Services/InviteMemberService'
import { AcceptInvitationService } from '../../Application/Services/AcceptInvitationService'
import { RemoveMemberService } from '../../Application/Services/RemoveMemberService'
import { ListMembersService } from '../../Application/Services/ListMembersService'
import { ChangeOrgMemberRoleService } from '../../Application/Services/ChangeOrgMemberRoleService'

export class OrganizationServiceProvider extends ModuleServiceProvider {
  override register(container: IContainer): void {
    const db = getCurrentDatabaseAccess()

    container.singleton('organizationRepository', () => new OrganizationRepository(db))
    container.singleton('organizationMemberRepository', () => new OrganizationMemberRepository(db))
    container.singleton('organizationInvitationRepository', () => new OrganizationInvitationRepository(db))

    container.bind('createOrganizationService', (c: IContainer) => {
      return new CreateOrganizationService(
        c.make('organizationRepository') as IOrganizationRepository,
        c.make('organizationMemberRepository') as IOrganizationMemberRepository,
        c.make('authRepository') as IAuthRepository,
      )
    })

    container.bind('updateOrganizationService', (c: IContainer) => {
      return new UpdateOrganizationService(c.make('organizationRepository') as IOrganizationRepository)
    })

    container.bind('listOrganizationsService', (c: IContainer) => {
      return new ListOrganizationsService(c.make('organizationRepository') as IOrganizationRepository)
    })

    container.bind('inviteMemberService', (c: IContainer) => {
      return new InviteMemberService(
        c.make('organizationRepository') as IOrganizationRepository,
        c.make('organizationInvitationRepository') as IOrganizationInvitationRepository,
      )
    })

    container.bind('acceptInvitationService', (c: IContainer) => {
      return new AcceptInvitationService(
        c.make('organizationInvitationRepository') as IOrganizationInvitationRepository,
        c.make('organizationMemberRepository') as IOrganizationMemberRepository,
        c.make('authRepository') as IAuthRepository,
      )
    })

    container.bind('removeMemberService', (c: IContainer) => {
      return new RemoveMemberService(c.make('organizationMemberRepository') as IOrganizationMemberRepository)
    })

    container.bind('listMembersService', (c: IContainer) => {
      return new ListMembersService(c.make('organizationMemberRepository') as IOrganizationMemberRepository)
    })

    container.bind('changeOrgMemberRoleService', (c: IContainer) => {
      return new ChangeOrgMemberRoleService(c.make('organizationMemberRepository') as IOrganizationMemberRepository)
    })
  }

  override boot(_context: any): void {
    console.log('🏢 [Organization] Module loaded')
  }
}
```

- [ ] **Step 4: 建立 Organization module index.ts**

```typescript
// src/Modules/Organization/index.ts
// Domain
export { Organization } from './Domain/Aggregates/Organization'
export { OrganizationMember } from './Domain/Entities/OrganizationMember'
export { OrganizationInvitation } from './Domain/Entities/OrganizationInvitation'
export { OrgSlug } from './Domain/ValueObjects/OrgSlug'
export { OrgMemberRole, OrgMemberRoleType } from './Domain/ValueObjects/OrgMemberRole'
export { InvitationStatus, InvitationStatusType } from './Domain/ValueObjects/InvitationStatus'
export type { IOrganizationRepository } from './Domain/Repositories/IOrganizationRepository'
export type { IOrganizationMemberRepository } from './Domain/Repositories/IOrganizationMemberRepository'
export type { IOrganizationInvitationRepository } from './Domain/Repositories/IOrganizationInvitationRepository'

// Application
export { CreateOrganizationService } from './Application/Services/CreateOrganizationService'
export { UpdateOrganizationService } from './Application/Services/UpdateOrganizationService'
export { ListOrganizationsService } from './Application/Services/ListOrganizationsService'
export { InviteMemberService } from './Application/Services/InviteMemberService'
export { AcceptInvitationService } from './Application/Services/AcceptInvitationService'
export { RemoveMemberService } from './Application/Services/RemoveMemberService'
export { ListMembersService } from './Application/Services/ListMembersService'
export { ChangeOrgMemberRoleService } from './Application/Services/ChangeOrgMemberRoleService'

// Infrastructure
export { OrganizationServiceProvider } from './Infrastructure/Providers/OrganizationServiceProvider'

// Presentation
export { OrganizationController } from './Presentation/Controllers/OrganizationController'
export { registerOrganizationRoutes } from './Presentation/Routes/organization.routes'
```

- [ ] **Step 5: 更新 wiring/index.ts — 新增 registerOrganization**

```typescript
import { OrganizationController, registerOrganizationRoutes } from '@/Modules/Organization'

export const registerOrganization = (core: PlanetCore): void => {
  const router = createGravitoModuleRouter(core)
  const controller = new OrganizationController(
    core.container.make('createOrganizationService') as any,
    core.container.make('updateOrganizationService') as any,
    core.container.make('listOrganizationsService') as any,
    core.container.make('inviteMemberService') as any,
    core.container.make('acceptInvitationService') as any,
    core.container.make('removeMemberService') as any,
    core.container.make('listMembersService') as any,
    core.container.make('changeOrgMemberRoleService') as any,
  )
  registerOrganizationRoutes(router, controller)
}
```

- [ ] **Step 6: 更新 bootstrap.ts**

```typescript
import { OrganizationServiceProvider } from './Modules/Organization/Infrastructure/Providers/OrganizationServiceProvider'

// 在 UserServiceProvider 之後加入：
core.register(createGravitoServiceProvider(new OrganizationServiceProvider()))
```

- [ ] **Step 7: 更新 routes.ts**

```typescript
import { registerOrganization } from './wiring'

// 在 registerUser(core) 之後加入：
registerOrganization(core)
```

- [ ] **Step 8: 執行所有測試**

Run: `bun test`
Expected: 全部 PASS

- [ ] **Step 9: Commit**

```bash
git add src/Modules/Organization/ src/wiring/index.ts src/bootstrap.ts src/routes.ts
git commit -m "feat: [org] 完成 Organization 模組 — Controller、Routes、ServiceProvider、Wiring"
```

---

### Task 8.5: 補完 Controller 中的 501 端點

**Files:**
- Modify: `src/Modules/Organization/Presentation/Controllers/OrganizationController.ts`
- Create: `src/Modules/Organization/Application/Services/GetOrganizationService.ts`
- Create: `src/Modules/Organization/Application/Services/ChangeOrgStatusService.ts`
- Create: `src/Modules/Organization/Application/Services/ListInvitationsService.ts`
- Create: `src/Modules/Organization/Application/Services/CancelInvitationService.ts`

- [ ] **Step 1: 實作 GetOrganizationService**

```typescript
// src/Modules/Organization/Application/Services/GetOrganizationService.ts
import type { IOrganizationRepository } from '../../Domain/Repositories/IOrganizationRepository'
import type { OrganizationResponse } from '../DTOs/OrganizationDTO'

export class GetOrganizationService {
  constructor(private orgRepository: IOrganizationRepository) {}

  async execute(orgId: string): Promise<OrganizationResponse> {
    try {
      const org = await this.orgRepository.findById(orgId)
      if (!org) {
        return { success: false, message: '找不到組織', error: 'ORG_NOT_FOUND' }
      }
      return { success: true, message: '取得成功', data: org.toDTO() }
    } catch (error: any) {
      return { success: false, message: error.message || '取得失敗', error: error.message }
    }
  }
}
```

- [ ] **Step 2: 實作 ChangeOrgStatusService**

```typescript
// src/Modules/Organization/Application/Services/ChangeOrgStatusService.ts
import type { IOrganizationRepository } from '../../Domain/Repositories/IOrganizationRepository'
import type { OrganizationResponse } from '../DTOs/OrganizationDTO'

export class ChangeOrgStatusService {
  constructor(private orgRepository: IOrganizationRepository) {}

  async execute(orgId: string, status: 'active' | 'suspended'): Promise<OrganizationResponse> {
    try {
      const org = await this.orgRepository.findById(orgId)
      if (!org) {
        return { success: false, message: '找不到組織', error: 'ORG_NOT_FOUND' }
      }

      const updated = status === 'suspended' ? org.suspend() : org.activate()
      await this.orgRepository.update(updated)

      return { success: true, message: `組織已${status === 'suspended' ? '停用' : '啟用'}`, data: updated.toDTO() }
    } catch (error: any) {
      return { success: false, message: error.message || '操作失敗', error: error.message }
    }
  }
}
```

- [ ] **Step 3: 實作 ListInvitationsService**

```typescript
// src/Modules/Organization/Application/Services/ListInvitationsService.ts
import type { IOrganizationInvitationRepository } from '../../Domain/Repositories/IOrganizationInvitationRepository'
import type { OrganizationResponse } from '../DTOs/OrganizationDTO'

export class ListInvitationsService {
  constructor(private invitationRepository: IOrganizationInvitationRepository) {}

  async execute(orgId: string): Promise<OrganizationResponse> {
    try {
      const invitations = await this.invitationRepository.findByOrgId(orgId)
      return {
        success: true,
        message: '取得邀請列表成功',
        data: { invitations: invitations.map((i) => i.toDTO()) },
      }
    } catch (error: any) {
      return { success: false, message: error.message || '取得失敗', error: error.message }
    }
  }
}
```

- [ ] **Step 4: 實作 CancelInvitationService**

```typescript
// src/Modules/Organization/Application/Services/CancelInvitationService.ts
import type { IOrganizationInvitationRepository } from '../../Domain/Repositories/IOrganizationInvitationRepository'
import type { OrganizationResponse } from '../DTOs/OrganizationDTO'

export class CancelInvitationService {
  constructor(private invitationRepository: IOrganizationInvitationRepository) {}

  async execute(invitationId: string): Promise<OrganizationResponse> {
    try {
      await this.invitationRepository.cancel(invitationId)
      return { success: true, message: '邀請已取消' }
    } catch (error: any) {
      return { success: false, message: error.message || '取消失敗', error: error.message }
    }
  }
}
```

- [ ] **Step 5: 更新 OrganizationController 中的 501 端點**

替換 `get` 方法：
```typescript
async get(ctx: IHttpContext): Promise<Response> {
  const orgId = ctx.getParam('id')
  if (!orgId) return ctx.json({ success: false, message: '缺少 ID' }, 400)
  const result = await this.getOrgService.execute(orgId)
  return ctx.json(result, result.success ? 200 : 404)
}
```

替換 `changeStatus` 方法：
```typescript
async changeStatus(ctx: IHttpContext): Promise<Response> {
  const orgId = ctx.getParam('id')
  if (!orgId) return ctx.json({ success: false, message: '缺少 ID' }, 400)
  const body = await ctx.getJsonBody<{ status: 'active' | 'suspended' }>()
  const result = await this.changeOrgStatusService.execute(orgId, body.status)
  return ctx.json(result, result.success ? 200 : 400)
}
```

替換 `listInvitations` 方法：
```typescript
async listInvitations(ctx: IHttpContext): Promise<Response> {
  const orgId = ctx.getParam('id')
  if (!orgId) return ctx.json({ success: false, message: '缺少 ID' }, 400)
  const result = await this.listInvitationsService.execute(orgId)
  return ctx.json(result, 200)
}
```

替換 `cancelInvitation` 方法：
```typescript
async cancelInvitation(ctx: IHttpContext): Promise<Response> {
  const invId = ctx.getParam('invId')
  if (!invId) return ctx.json({ success: false, message: '缺少邀請 ID' }, 400)
  const result = await this.cancelInvitationService.execute(invId)
  return ctx.json(result, result.success ? 200 : 400)
}
```

更新 constructor 新增 4 個 service 依賴：`getOrgService`, `changeOrgStatusService`, `listInvitationsService`, `cancelInvitationService`

- [ ] **Step 6: 更新 OrganizationServiceProvider 和 wiring/index.ts 註冊新 service**

- [ ] **Step 7: 更新 index.ts 導出新 service**

- [ ] **Step 8: 執行所有測試**

Run: `bun test`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add src/Modules/Organization/
git commit -m "feat: [org] 補完 Organization Controller 所有端點"
```

---

### Task 9: 全面驗證

- [ ] **Step 1: 執行所有測試**

Run: `bun test`
Expected: 全部 PASS

- [ ] **Step 2: TypeScript 類型檢查**

Run: `bun run typecheck`
Expected: 無錯誤

- [ ] **Step 3: Lint 檢查**

Run: `bun run lint`
Expected: 無錯誤

- [ ] **Step 4: 最終 Commit（如有未提交的修復）**

```bash
git add -A
git commit -m "chore: [phase2] Phase 2 Identity 全面驗證通過"
```
