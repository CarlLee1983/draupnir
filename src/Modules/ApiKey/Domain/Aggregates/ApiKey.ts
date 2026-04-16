/**
 * ApiKey
 * Domain Aggregate: represents a secure authentication key for API access.
 *
 * Responsibilities:
 * - Define identity and hashed credentials
 * - Manage status lifecycle (active, pending, revoked, suspended)
 * - Handle scope and permissions
 * - Manage temporal constraints (expiration, revocation)
 */

import { KeyHash } from '../ValueObjects/KeyHash'
import { KeyLabel } from '../ValueObjects/KeyLabel'
import { KeyScope, type KeyScopeJSON } from '../ValueObjects/KeyScope'
import { KeyStatus } from '../ValueObjects/KeyStatus'

/** Properties defining an ApiKey's state. */
interface ApiKeyProps {
  readonly id: string
  readonly orgId: string
  readonly createdByUserId: string
  readonly label: KeyLabel
  readonly keyHash: KeyHash
  readonly gatewayKeyId: string
  readonly status: KeyStatus
  readonly scope: KeyScope
  readonly quotaAllocated: number
  readonly assignedMemberId: string | null
  readonly suspensionReason: string | null
  readonly preFreezeRateLimit: string | null // JSON string
  readonly suspendedAt: Date | null
  readonly expiresAt: Date | null
  readonly revokedAt: Date | null
  readonly createdAt: Date
  readonly updatedAt: Date
}

/** Parameters for creating a new ApiKey. */
interface CreateApiKeyParams {
  id: string
  orgId: string
  createdByUserId: string
  label: string
  gatewayKeyId: string
  keyHash: string
  scope?: KeyScope
  expiresAt?: Date | null
}

/**
 * ApiKey Aggregate Root
 * Handles business logic for API key management and security.
 */
export class ApiKey {
  private readonly props: ApiKeyProps

  private constructor(props: ApiKeyProps) {
    this.props = props
  }

  /**
   * Creates a new pending API key from a pre-computed hash.
   * Callers must hash the raw key via IKeyHashingService before calling this.
   */
  static create(params: CreateApiKeyParams): ApiKey {
    return new ApiKey({
      id: params.id,
      orgId: params.orgId,
      createdByUserId: params.createdByUserId,
      label: new KeyLabel(params.label),
      keyHash: KeyHash.fromExisting(params.keyHash),
      gatewayKeyId: params.gatewayKeyId,
      status: KeyStatus.pending(),
      scope: params.scope ?? KeyScope.unrestricted(),
      quotaAllocated: 0,
      assignedMemberId: null,
      suspensionReason: null,
      preFreezeRateLimit: null,
      suspendedAt: null,
      expiresAt: params.expiresAt ?? null,
      revokedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  /**
   * Reconstitutes an API key from database row.
   */
  static fromDatabase(row: Record<string, unknown>): ApiKey {
    const scopeJson: KeyScopeJSON =
      typeof row.scope === 'string' ? JSON.parse(row.scope as string) : (row.scope as KeyScopeJSON)

    return new ApiKey({
      id: row.id as string,
      orgId: row.org_id as string,
      createdByUserId: row.created_by_user_id as string,
      label: new KeyLabel(row.label as string),
      keyHash: KeyHash.fromExisting(row.key_hash as string),
      gatewayKeyId: row.bifrost_virtual_key_id as string,
      status: KeyStatus.from(row.status as string),
      scope: KeyScope.fromJSON(scopeJson),
      quotaAllocated: typeof row.quota_allocated === 'number' ? row.quota_allocated : 0,
      assignedMemberId: (row.assigned_member_id as string | null) ?? null,
      suspensionReason: (row.suspension_reason as string) ?? null,
      preFreezeRateLimit: (row.pre_freeze_rate_limit as string) ?? null,
      suspendedAt: row.suspended_at ? new Date(row.suspended_at as string) : null,
      expiresAt: row.expires_at ? new Date(row.expires_at as string) : null,
      revokedAt: row.revoked_at ? new Date(row.revoked_at as string) : null,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    })
  }

  /** Activates a pending key. */
  activate(): ApiKey {
    if (!this.props.status.isPending()) {
      throw new Error('Only pending keys can be activated')
    }
    return new ApiKey({
      ...this.props,
      status: KeyStatus.active(),
      updatedAt: new Date(),
    })
  }

  /** Revokes the key permanently. */
  revoke(): ApiKey {
    if (this.props.status.isRevoked()) {
      throw new Error('Key is already revoked')
    }
    if (this.props.status.isPending()) {
      throw new Error('Pending keys cannot be revoked; activate or delete them instead')
    }
    return new ApiKey({
      ...this.props,
      status: KeyStatus.revoked(),
      revokedAt: new Date(),
      updatedAt: new Date(),
    })
  }

  /** Suspends the key for credit reasons. */
  suspend(reason: string, currentRateLimit: { rpm: number | null; tpm: number | null }): ApiKey {
    if (this.props.status.isSuspendedNoCredit()) return this
    return new ApiKey({
      ...this.props,
      status: KeyStatus.suspendedNoCredit(),
      suspensionReason: reason,
      preFreezeRateLimit: JSON.stringify(currentRateLimit),
      suspendedAt: new Date(),
      updatedAt: new Date(),
    })
  }

  /** Restores a previously credit-suspended key to active status. */
  unsuspend(): ApiKey {
    if (!this.props.status.isSuspendedNoCredit()) return this
    return new ApiKey({
      ...this.props,
      status: KeyStatus.active(),
      suspensionReason: null,
      preFreezeRateLimit: null,
      suspendedAt: null,
      updatedAt: new Date(),
    })
  }

  /** Updates the human-readable key label. */
  updateLabel(newLabel: string): ApiKey {
    return new ApiKey({
      ...this.props,
      label: new KeyLabel(newLabel),
      updatedAt: new Date(),
    })
  }

  /** Updates key permissions and constraints. */
  updateScope(newScope: KeyScope): ApiKey {
    if (this.props.status.isRevoked()) {
      throw new Error('Cannot update scope of a revoked key')
    }
    return new ApiKey({
      ...this.props,
      scope: newScope,
      updatedAt: new Date(),
    })
  }

  /** Returns a copy with adjusted quota allocation (admin only). */
  adjustQuotaAllocated(newAllocation: number): ApiKey {
    if (newAllocation < 0) {
      throw new Error('Quota allocation cannot be negative')
    }
    return new ApiKey({
      ...this.props,
      quotaAllocated: newAllocation,
      updatedAt: new Date(),
    })
  }

  /** 將 key 指派給某位組織成員（僅 Manager 呼叫；跨組織驗證由 Application layer 負責）。 */
  assignTo(memberUserId: string): ApiKey {
    if (!memberUserId || memberUserId.trim() === '') {
      throw new Error('assignTo: memberUserId cannot be empty')
    }
    if (this.props.status.isRevoked()) {
      throw new Error('Cannot assign a revoked key')
    }
    return new ApiKey({
      ...this.props,
      assignedMemberId: memberUserId,
      updatedAt: new Date(),
    })
  }

  /** 取消指派。 */
  unassign(): ApiKey {
    return new ApiKey({
      ...this.props,
      assignedMemberId: null,
      updatedAt: new Date(),
    })
  }

  /** 目前被指派的 member user_id；NULL 代表未指派。 */
  get assignedMemberId(): string | null {
    return this.props.assignedMemberId
  }

  /** Current quota allocated to this key (in contract credit units). */
  get quotaAllocated(): number {
    return this.props.quotaAllocated
  }

  /** Unique identifier. */
  get id(): string {
    return this.props.id
  }
  /** Associated organization. */
  get orgId(): string {
    return this.props.orgId
  }
  /** ID of the creating user. */
  get createdByUserId(): string {
    return this.props.createdByUserId
  }
  /** Human-readable label. */
  get label(): string {
    return this.props.label.getValue()
  }
  /** Securely stored key hash. */
  get keyHashValue(): string {
    return this.props.keyHash.getValue()
  }
  /** Gateway-specific key identifier. */
  get gatewayKeyId(): string {
    return this.props.gatewayKeyId
  }
  /** Current status (active, pending, etc). */
  get status(): string {
    return this.props.status.getValue()
  }
  /** Key constraints and model access. */
  get scope(): KeyScope {
    return this.props.scope
  }
  /** Snapshot of limits before credit-suspension. */
  get preFreezeRateLimit(): { rpm: number | null; tpm: number | null } | null {
    if (!this.props.preFreezeRateLimit) return null
    return JSON.parse(this.props.preFreezeRateLimit)
  }
  /** Raw JSON string of limits snapshot before credit-suspension. */
  get preFreezeRateLimitRaw(): string | null {
    return this.props.preFreezeRateLimit
  }
  /** Formal reason for current suspension. */
  get suspensionReason(): string | null {
    return this.props.suspensionReason
  }
  /** Date when the key was suspended. */
  get suspendedAt(): Date | null {
    return this.props.suspendedAt
  }
  /** Date when the key naturally expires. */
  get expiresAt(): Date | null {
    return this.props.expiresAt
  }
  /** Date when the key was manualy revoked. */
  get revokedAt(): Date | null {
    return this.props.revokedAt
  }
  /** Record creation date. */
  get createdAt(): Date {
    return this.props.createdAt
  }
  /** Record last modification date. */
  get updatedAt(): Date {
    return this.props.updatedAt
  }
}
