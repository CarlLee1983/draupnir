/**
 * AppApiKey
 * Domain Aggregate: represents a system/application-to-application API key.
 *
 * Responsibilities:
 * - Define identity and hashed credentials for applications
 * - Manage key rotation lifecycle and grace periods
 * - Handle module-level access and binding
 * - Manage temporal constraints and status
 */

import { KeyHash } from '@/Shared/Domain/ValueObjects/KeyHash'
import { KeyLabel } from '@/Shared/Domain/ValueObjects/KeyLabel'
import { KeyStatus } from '@/Shared/Domain/ValueObjects/KeyStatus'
import { AppKeyScope } from '../ValueObjects/AppKeyScope'
import { BoundModules } from '../ValueObjects/BoundModules'
import { KeyRotationPolicy, type KeyRotationPolicyJSON } from '../ValueObjects/KeyRotationPolicy'

/** Properties defining an AppApiKey's state. */
interface AppApiKeyProps {
  readonly id: string
  readonly orgId: string
  readonly issuedByUserId: string
  readonly label: KeyLabel
  readonly keyHash: KeyHash
  readonly gatewayKeyId: string
  readonly status: KeyStatus
  readonly scope: AppKeyScope
  readonly rotationPolicy: KeyRotationPolicy
  readonly boundModules: BoundModules
  readonly previousKeyHash: string | null
  readonly previousGatewayKeyId: string | null
  readonly gracePeriodEndsAt: Date | null
  readonly expiresAt: Date | null
  readonly revokedAt: Date | null
  readonly createdAt: Date
  readonly updatedAt: Date
}

/** Parameters for creating a new AppApiKey. */
interface CreateAppApiKeyParams {
  id: string
  orgId: string
  issuedByUserId: string
  label: string
  gatewayKeyId: string
  keyHash: string
  scope?: AppKeyScope
  rotationPolicy?: KeyRotationPolicy
  boundModules?: BoundModules
  expiresAt?: Date | null
}

/**
 * AppApiKey Aggregate Root
 * Handles business logic for application-specific API keys with rotation support.
 */
export class AppApiKey {
  private readonly props: AppApiKeyProps

  private constructor(props: AppApiKeyProps) {
    this.props = props
  }

  /**
   * Creates a new pending application API key from a pre-computed hash.
   * Callers must hash the raw key via IKeyHashingService before calling this.
   */
  static create(params: CreateAppApiKeyParams): AppApiKey {
    return new AppApiKey({
      id: params.id,
      orgId: params.orgId,
      issuedByUserId: params.issuedByUserId,
      label: new KeyLabel(params.label),
      keyHash: KeyHash.fromExisting(params.keyHash),
      gatewayKeyId: params.gatewayKeyId,
      status: KeyStatus.pending(),
      scope: params.scope ?? AppKeyScope.read(),
      rotationPolicy: params.rotationPolicy ?? KeyRotationPolicy.manual(),
      boundModules: params.boundModules ?? BoundModules.empty(),
      previousKeyHash: null,
      previousGatewayKeyId: null,
      gracePeriodEndsAt: null,
      expiresAt: params.expiresAt ?? null,
      revokedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  /**
   * Reconstitutes an application API key from database record.
   */
  static fromDatabase(row: Record<string, unknown>): AppApiKey {
    const rotationPolicyJson: KeyRotationPolicyJSON =
      typeof row.rotation_policy === 'string'
        ? JSON.parse(row.rotation_policy as string)
        : (row.rotation_policy as KeyRotationPolicyJSON)

    const boundModulesJson: string[] =
      typeof row.bound_modules === 'string'
        ? JSON.parse(row.bound_modules as string)
        : ((row.bound_modules as string[]) ?? [])

    return new AppApiKey({
      id: row.id as string,
      orgId: row.org_id as string,
      issuedByUserId: row.issued_by_user_id as string,
      label: new KeyLabel(row.label as string),
      keyHash: KeyHash.fromExisting(row.key_hash as string),
      gatewayKeyId: row.bifrost_virtual_key_id as string,
      status: KeyStatus.from(row.status as string),
      scope: AppKeyScope.from(row.scope as string),
      rotationPolicy: KeyRotationPolicy.fromJSON(rotationPolicyJson),
      boundModules: BoundModules.fromJSON(boundModulesJson),
      previousKeyHash: (row.previous_key_hash as string) ?? null,
      previousGatewayKeyId: (row.previous_bifrost_virtual_key_id as string) ?? null,
      gracePeriodEndsAt: row.grace_period_ends_at
        ? new Date(row.grace_period_ends_at as string)
        : null,
      expiresAt: row.expires_at ? new Date(row.expires_at as string) : null,
      revokedAt: row.revoked_at ? new Date(row.revoked_at as string) : null,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    })
  }

  /** Activates a pending key. */
  activate(): AppApiKey {
    if (!this.props.status.isPending()) {
      throw new Error('Only pending keys can be activated')
    }
    return new AppApiKey({
      ...this.props,
      status: KeyStatus.active(),
      updatedAt: new Date(),
    })
  }

  /** Revokes the key permanently. */
  revoke(): AppApiKey {
    if (this.props.status.isRevoked()) {
      throw new Error('Key is already revoked')
    }
    if (this.props.status.isPending()) {
      throw new Error('Pending keys cannot be revoked; activate or delete them instead')
    }
    return new AppApiKey({
      ...this.props,
      status: KeyStatus.revoked(),
      revokedAt: new Date(),
      updatedAt: new Date(),
    })
  }

  /**
   * Rotates the key material using a pre-computed hash and setting a grace period
   * for the previous key.
   * Callers must hash the new raw key via IKeyHashingService before calling this.
   */
  rotate(newKeyHash: string, newGatewayKeyId: string): AppApiKey {
    if (!this.props.status.isActive()) {
      throw new Error('Only active keys can be rotated')
    }
    const gracePeriodHours = this.props.rotationPolicy.getGracePeriodHours()
    const gracePeriodEndsAt = new Date(Date.now() + gracePeriodHours * 60 * 60 * 1000)

    return new AppApiKey({
      ...this.props,
      keyHash: KeyHash.fromExisting(newKeyHash),
      gatewayKeyId: newGatewayKeyId,
      previousKeyHash: this.props.keyHash.getValue(),
      previousGatewayKeyId: this.props.gatewayKeyId,
      gracePeriodEndsAt,
      updatedAt: new Date(),
    })
  }

  /** Finalizes rotation by clearing the previous key and grace period. */
  completeRotation(): AppApiKey {
    return new AppApiKey({
      ...this.props,
      previousKeyHash: null,
      previousGatewayKeyId: null,
      gracePeriodEndsAt: null,
      updatedAt: new Date(),
    })
  }

  /** Updates the functional scope of the key. */
  updateScope(newScope: AppKeyScope): AppApiKey {
    if (this.props.status.isRevoked()) {
      throw new Error('Cannot update scope of a revoked key')
    }
    return new AppApiKey({
      ...this.props,
      scope: newScope,
      updatedAt: new Date(),
    })
  }

  /** Updates the set of modules this key is authorized to access. */
  updateBoundModules(newModules: BoundModules): AppApiKey {
    if (this.props.status.isRevoked()) {
      throw new Error('Cannot update bound modules of a revoked key')
    }
    return new AppApiKey({
      ...this.props,
      boundModules: newModules,
      updatedAt: new Date(),
    })
  }

  /** Unique identifier. */
  get id(): string {
    return this.props.id
  }
  /** Associated organization. */
  get orgId(): string {
    return this.props.orgId
  }
  /** ID of the user who issued the key. */
  get issuedByUserId(): string {
    return this.props.issuedByUserId
  }
  /** Human-readable label. */
  get label(): string {
    return this.props.label.getValue()
  }
  /** Hashed value of the current key. */
  get keyHashValue(): string {
    return this.props.keyHash.getValue()
  }
  /** Gateway identifier for the current key. */
  get gatewayKeyId(): string {
    return this.props.gatewayKeyId
  }
  /** Current status. */
  get status(): string {
    return this.props.status.getValue()
  }
  /** Permission scope. */
  get appKeyScope(): AppKeyScope {
    return this.props.scope
  }
  /** Configuration for key rotation. */
  get rotationPolicy(): KeyRotationPolicy {
    return this.props.rotationPolicy
  }
  /** Modules authorized for this key. */
  get boundModules(): BoundModules {
    return this.props.boundModules
  }
  /** Hash of the previous key during grace period. */
  get previousKeyHash(): string | null {
    return this.props.previousKeyHash
  }
  /** Gateway ID of the previous key during grace period. */
  get previousGatewayKeyId(): string | null {
    return this.props.previousGatewayKeyId
  }
  /** Deadline for the rotation grace period. */
  get gracePeriodEndsAt(): Date | null {
    return this.props.gracePeriodEndsAt
  }
  /** Expiration timestamp. */
  get expiresAt(): Date | null {
    return this.props.expiresAt
  }
  /** Revocation timestamp. */
  get revokedAt(): Date | null {
    return this.props.revokedAt
  }
  /** Record creation timestamp. */
  get createdAt(): Date {
    return this.props.createdAt
  }
  /** Record update timestamp. */
  get updatedAt(): Date {
    return this.props.updatedAt
  }
}
