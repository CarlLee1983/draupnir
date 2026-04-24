import { KeyHash } from '../ValueObjects/KeyHash'
import { KeyLabel } from '../ValueObjects/KeyLabel'
import { KeyScope, type KeyScopeJSON } from '../ValueObjects/KeyScope'
import { KeyStatus } from '../ValueObjects/KeyStatus'

/**
 * Properties defining an ApiKey's state.
 */
interface ApiKeyProps {
  /** Unique identifier for the API key. */
  readonly id: string
  /** ID of the organization this key belongs to. */
  readonly orgId: string
  /** ID of the user who created this key. */
  readonly createdByUserId: string
  /** Human-readable label for the key. */
  readonly label: KeyLabel
  /** Secure cryptographic hash of the raw API key. */
  readonly keyHash: KeyHash
  /** Identifier for the key in the downstream gateway (e.g., Bifrost). */
  readonly gatewayKeyId: string
  /** The raw key value from the gateway, only available immediately after creation. */
  readonly gatewayKeyValue: string | null
  /** Current operational status of the key. */
  readonly status: KeyStatus
  /** Permissions and model access constraints for the key. */
  readonly scope: KeyScope
  /** Amount of credit quota allocated to this specific key. */
  readonly quotaAllocated: number
  /** ID of the organization member this key is assigned to, if any. */
  readonly assignedMemberId: string | null
  /** Reason for the key's current suspension, if applicable. */
  readonly suspensionReason: string | null
  /** Snapshot of rate limits (RPM/TPM) stored before the key was frozen due to credit exhaustion. */
  readonly preFreezeRateLimit: string | null // JSON string
  /** Timestamp when the key was suspended. */
  readonly suspendedAt: Date | null
  /** Optional timestamp when the key will automatically expire. */
  readonly expiresAt: Date | null
  /** Timestamp when the key was manually revoked. */
  readonly revokedAt: Date | null
  /** Timestamp when the record was created. */
  readonly createdAt: Date
  /** Timestamp when the record was last updated. */
  readonly updatedAt: Date
}

/**
 * Parameters for creating a new ApiKey instance.
 */
interface CreateApiKeyParams {
  /** Unique identifier for the new key. */
  id: string
  /** Organization ID. */
  orgId: string
  /** Creator's user ID. */
  createdByUserId: string
  /** Initial human-readable label. */
  label: string
  /** Downstream gateway key ID. */
  gatewayKeyId: string
  /** Optional raw gateway key value (for one-time display). */
  gatewayKeyValue?: string | null
  /** Pre-computed cryptographic hash of the key. */
  keyHash: string
  /** Optional access scope; defaults to unrestricted. */
  scope?: KeyScope
  /** Optional expiration date. */
  expiresAt?: Date | null
}

/**
 * ApiKey Aggregate Root
 * Handles business logic for API key management and security.
 *
 * Responsibilities:
 * - Manage identity and credentials through secure hashing.
 * - Track lifecycle status (Pending -> Active -> Revoked/Suspended).
 * - Enforce scope-based permission constraints.
 * - Manage assignment of keys to specific organization members.
 * - Handle quota allocation for credit management.
 */
export class ApiKey {
  /** Internal state of the API key. */
  private readonly props: ApiKeyProps

  /**
   * Internal constructor for the ApiKey aggregate.
   * Use static factory methods like `create` or `fromDatabase` instead.
   *
   * @param props The initial properties for the aggregate.
   */
  private constructor(props: ApiKeyProps) {
    this.props = props
  }

  /**
   * Creates a new API key in PENDING status.
   * Callers must ensure the raw key is securely generated and hashed before creation.
   *
   * @param params Creation parameters including identifiers, labels, and security hashes.
   * @returns A new ApiKey instance.
   */
  static create(params: CreateApiKeyParams): ApiKey {
    return new ApiKey({
      id: params.id,
      orgId: params.orgId,
      createdByUserId: params.createdByUserId,
      label: new KeyLabel(params.label),
      keyHash: KeyHash.fromExisting(params.keyHash),
      gatewayKeyId: params.gatewayKeyId,
      gatewayKeyValue: params.gatewayKeyValue ?? null,
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
   * Reconstitutes an API key instance from a database record.
   *
   * @param row The raw database record.
   * @returns A reconstituted ApiKey instance.
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
      gatewayKeyValue: (row.bifrost_key_value as string | null) ?? null,
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

  /**
   * Transitions a PENDING key to ACTIVE status (immutable pattern).
   *
   * @throws Error if the key is not in PENDING status.
   * @returns A new ApiKey instance with ACTIVE status.
   */
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

  /**
   * Permanently revokes the API key (immutable pattern).
   * Revocation is terminal and cannot be undone.
   *
   * @throws Error if the key is already revoked or still pending.
   * @returns A new ApiKey instance with REVOKED status.
   */
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

  /**
   * Suspends the key, typically due to organization credit exhaustion (immutable pattern).
   *
   * @param reason The technical or business reason for suspension.
   * @param currentRateLimit Snapshot of current rate limits to restore later.
   * @returns A new ApiKey instance with SUSPENDED_NO_CREDIT status.
   */
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

  /**
   * Restores a credit-suspended key to ACTIVE status (immutable pattern).
   *
   * @returns A new ApiKey instance with ACTIVE status if it was suspended; otherwise the same instance.
   */
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

  /**
   * Updates the human-readable label of the key (immutable pattern).
   *
   * @param newLabel The new label string.
   * @returns A new ApiKey instance with the updated label.
   */
  updateLabel(newLabel: string): ApiKey {
    return new ApiKey({
      ...this.props,
      label: new KeyLabel(newLabel),
      updatedAt: new Date(),
    })
  }

  /**
   * Updates the access scope and permissions of the key (immutable pattern).
   *
   * @param newScope The new KeyScope definition.
   * @throws Error if the key is already revoked.
   * @returns A new ApiKey instance with the updated scope.
   */
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

  /**
   * Adjusts the credit quota allocated to this specific key (immutable pattern).
   *
   * @param newAllocation The new numeric quota value.
   * @throws Error if the allocation is negative.
   * @returns A new ApiKey instance with the updated quota.
   */
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

  /**
   * Assigns the API key to a specific organization member (immutable pattern).
   *
   * @param memberUserId The user ID of the member to assign this key to.
   * @throws Error if the member ID is empty or the key is revoked.
   * @returns A new ApiKey instance with the updated assignment.
   */
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

  /**
   * Removes any existing member assignment from the key (immutable pattern).
   *
   * @returns A new ApiKey instance with no assignment.
   */
  unassign(): ApiKey {
    return new ApiKey({
      ...this.props,
      assignedMemberId: null,
      updatedAt: new Date(),
    })
  }

  /** Gets the ID of the assigned member user, or null if unassigned. */
  get assignedMemberId(): string | null {
    return this.props.assignedMemberId
  }

  /** Gets the current credit quota allocated to this key. */
  get quotaAllocated(): number {
    return this.props.quotaAllocated
  }

  /** Gets the unique identifier of the key. */
  get id(): string {
    return this.props.id
  }

  /** Gets the ID of the organization that owns this key. */
  get orgId(): string {
    return this.props.orgId
  }

  /** Gets the ID of the user who created this key. */
  get createdByUserId(): string {
    return this.props.createdByUserId
  }

  /** Gets the string value of the human-readable label. */
  get label(): string {
    return this.props.label.getValue()
  }

  /** Gets the string value of the secure key hash. */
  get keyHashValue(): string {
    return this.props.keyHash.getValue()
  }

  /** Gets the gateway-specific identifier for the key. */
  get gatewayKeyId(): string {
    return this.props.gatewayKeyId
  }

  /** Gets the raw gateway key value, if available (typically only after creation). */
  get gatewayKeyValue(): string | null {
    return this.props.gatewayKeyValue
  }

  /** Gets the string representation of the key's current status. */
  get status(): string {
    return this.props.status.getValue()
  }

  /** Gets the access scope object for the key. */
  get scope(): KeyScope {
    return this.props.scope
  }

  /** Gets a structured snapshot of rate limits before credit-suspension. */
  get preFreezeRateLimit(): { rpm: number | null; tpm: number | null } | null {
    if (!this.props.preFreezeRateLimit) return null
    return JSON.parse(this.props.preFreezeRateLimit)
  }

  /** Gets the raw JSON string of rate limits snapshot before credit-suspension. */
  get preFreezeRateLimitRaw(): string | null {
    return this.props.preFreezeRateLimit
  }

  /** Gets the reason string for current suspension, if any. */
  get suspensionReason(): string | null {
    return this.props.suspensionReason
  }

  /** Gets the timestamp when the key was suspended, or null. */
  get suspendedAt(): Date | null {
    return this.props.suspendedAt
  }

  /** Gets the timestamp when the key will expire, or null. */
  get expiresAt(): Date | null {
    return this.props.expiresAt
  }

  /** Gets the timestamp when the key was revoked, or null. */
  get revokedAt(): Date | null {
    return this.props.revokedAt
  }

  /** Gets the timestamp when the key record was created. */
  get createdAt(): Date {
    return this.props.createdAt
  }

  /** Gets the timestamp when the key record was last updated. */
  get updatedAt(): Date {
    return this.props.updatedAt
  }
}
