import { KeyHash } from '@/Modules/ApiKey/Domain/ValueObjects/KeyHash'
import { KeyLabel } from '@/Modules/ApiKey/Domain/ValueObjects/KeyLabel'
import { KeyStatus } from '@/Modules/ApiKey/Domain/ValueObjects/KeyStatus'
import { AppKeyScope } from '../ValueObjects/AppKeyScope'
import { KeyRotationPolicy, type KeyRotationPolicyJSON } from '../ValueObjects/KeyRotationPolicy'
import { BoundModules } from '../ValueObjects/BoundModules'

interface AppApiKeyProps {
	readonly id: string
	readonly orgId: string
	readonly issuedByUserId: string
	readonly label: KeyLabel
	readonly keyHash: KeyHash
	readonly bifrostVirtualKeyId: string
	readonly status: KeyStatus
	readonly scope: AppKeyScope
	readonly rotationPolicy: KeyRotationPolicy
	readonly boundModules: BoundModules
	readonly previousKeyHash: string | null
	readonly previousBifrostVirtualKeyId: string | null
	readonly gracePeriodEndsAt: Date | null
	readonly expiresAt: Date | null
	readonly revokedAt: Date | null
	readonly createdAt: Date
	readonly updatedAt: Date
}

interface CreateAppApiKeyParams {
	id: string
	orgId: string
	issuedByUserId: string
	label: string
	bifrostVirtualKeyId: string
	rawKey: string
	scope?: AppKeyScope
	rotationPolicy?: KeyRotationPolicy
	boundModules?: BoundModules
	expiresAt?: Date | null
}

export class AppApiKey {
	private readonly props: AppApiKeyProps

	private constructor(props: AppApiKeyProps) {
		this.props = props
	}

	static async create(params: CreateAppApiKeyParams): Promise<AppApiKey> {
		const keyHash = await KeyHash.fromRawKey(params.rawKey)
		return new AppApiKey({
			id: params.id,
			orgId: params.orgId,
			issuedByUserId: params.issuedByUserId,
			label: new KeyLabel(params.label),
			keyHash,
			bifrostVirtualKeyId: params.bifrostVirtualKeyId,
			status: KeyStatus.pending(),
			scope: params.scope ?? AppKeyScope.read(),
			rotationPolicy: params.rotationPolicy ?? KeyRotationPolicy.manual(),
			boundModules: params.boundModules ?? BoundModules.empty(),
			previousKeyHash: null,
			previousBifrostVirtualKeyId: null,
			gracePeriodEndsAt: null,
			expiresAt: params.expiresAt ?? null,
			revokedAt: null,
			createdAt: new Date(),
			updatedAt: new Date(),
		})
	}

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
			bifrostVirtualKeyId: row.bifrost_virtual_key_id as string,
			status: KeyStatus.from(row.status as string),
			scope: AppKeyScope.from(row.scope as string),
			rotationPolicy: KeyRotationPolicy.fromJSON(rotationPolicyJson),
			boundModules: BoundModules.fromJSON(boundModulesJson),
			previousKeyHash: (row.previous_key_hash as string) ?? null,
			previousBifrostVirtualKeyId: (row.previous_bifrost_virtual_key_id as string) ?? null,
			gracePeriodEndsAt: row.grace_period_ends_at
				? new Date(row.grace_period_ends_at as string)
				: null,
			expiresAt: row.expires_at ? new Date(row.expires_at as string) : null,
			revokedAt: row.revoked_at ? new Date(row.revoked_at as string) : null,
			createdAt: new Date(row.created_at as string),
			updatedAt: new Date(row.updated_at as string),
		})
	}

	activate(): AppApiKey {
		if (!this.props.status.isPending()) {
			throw new Error('只有 pending 狀態的 Key 可以 activate')
		}
		return new AppApiKey({
			...this.props,
			status: KeyStatus.active(),
			updatedAt: new Date(),
		})
	}

	revoke(): AppApiKey {
		if (this.props.status.isRevoked()) {
			throw new Error('此 Key 已撤銷')
		}
		if (this.props.status.isPending()) {
			throw new Error('pending 狀態的 Key 不能撤銷，請先 activate 或直接刪除')
		}
		return new AppApiKey({
			...this.props,
			status: KeyStatus.revoked(),
			revokedAt: new Date(),
			updatedAt: new Date(),
		})
	}

	async rotate(newRawKey: string, newBifrostVirtualKeyId: string): Promise<AppApiKey> {
		if (!this.props.status.isActive()) {
			throw new Error('只有 active 狀態的 Key 可以輪換')
		}
		const newKeyHash = await KeyHash.fromRawKey(newRawKey)
		const gracePeriodHours = this.props.rotationPolicy.getGracePeriodHours()
		const gracePeriodEndsAt = new Date(Date.now() + gracePeriodHours * 60 * 60 * 1000)

		return new AppApiKey({
			...this.props,
			keyHash: newKeyHash,
			bifrostVirtualKeyId: newBifrostVirtualKeyId,
			previousKeyHash: this.props.keyHash.getValue(),
			previousBifrostVirtualKeyId: this.props.bifrostVirtualKeyId,
			gracePeriodEndsAt,
			updatedAt: new Date(),
		})
	}

	completeRotation(): AppApiKey {
		return new AppApiKey({
			...this.props,
			previousKeyHash: null,
			previousBifrostVirtualKeyId: null,
			gracePeriodEndsAt: null,
			updatedAt: new Date(),
		})
	}

	updateScope(newScope: AppKeyScope): AppApiKey {
		if (this.props.status.isRevoked()) {
			throw new Error('已撤銷的 Key 不能更新 scope')
		}
		return new AppApiKey({
			...this.props,
			scope: newScope,
			updatedAt: new Date(),
		})
	}

	updateBoundModules(newModules: BoundModules): AppApiKey {
		if (this.props.status.isRevoked()) {
			throw new Error('已撤銷的 Key 不能更新綁定模組')
		}
		return new AppApiKey({
			...this.props,
			boundModules: newModules,
			updatedAt: new Date(),
		})
	}

	get id(): string {
		return this.props.id
	}
	get orgId(): string {
		return this.props.orgId
	}
	get issuedByUserId(): string {
		return this.props.issuedByUserId
	}
	get label(): string {
		return this.props.label.getValue()
	}
	get keyHashValue(): string {
		return this.props.keyHash.getValue()
	}
	get bifrostVirtualKeyId(): string {
		return this.props.bifrostVirtualKeyId
	}
	get status(): string {
		return this.props.status.getValue()
	}
	get appKeyScope(): AppKeyScope {
		return this.props.scope
	}
	get rotationPolicy(): KeyRotationPolicy {
		return this.props.rotationPolicy
	}
	get boundModules(): BoundModules {
		return this.props.boundModules
	}
	get previousKeyHash(): string | null {
		return this.props.previousKeyHash
	}
	get previousBifrostVirtualKeyId(): string | null {
		return this.props.previousBifrostVirtualKeyId
	}
	get gracePeriodEndsAt(): Date | null {
		return this.props.gracePeriodEndsAt
	}
	get expiresAt(): Date | null {
		return this.props.expiresAt
	}
	get revokedAt(): Date | null {
		return this.props.revokedAt
	}
	get createdAt(): Date {
		return this.props.createdAt
	}
	get updatedAt(): Date {
		return this.props.updatedAt
	}

	toDatabaseRow(): Record<string, unknown> {
		return {
			id: this.props.id,
			org_id: this.props.orgId,
			issued_by_user_id: this.props.issuedByUserId,
			label: this.props.label.getValue(),
			key_hash: this.props.keyHash.getValue(),
			bifrost_virtual_key_id: this.props.bifrostVirtualKeyId,
			status: this.props.status.getValue(),
			scope: this.props.scope.getValue(),
			rotation_policy: JSON.stringify(this.props.rotationPolicy.toJSON()),
			bound_modules: JSON.stringify(this.props.boundModules.toJSON()),
			previous_key_hash: this.props.previousKeyHash,
			previous_bifrost_virtual_key_id: this.props.previousBifrostVirtualKeyId,
			grace_period_ends_at: this.props.gracePeriodEndsAt?.toISOString() ?? null,
			expires_at: this.props.expiresAt?.toISOString() ?? null,
			revoked_at: this.props.revokedAt?.toISOString() ?? null,
			created_at: this.props.createdAt.toISOString(),
			updated_at: this.props.updatedAt.toISOString(),
		}
	}

	toDTO(): Record<string, unknown> {
		return {
			id: this.props.id,
			orgId: this.props.orgId,
			issuedByUserId: this.props.issuedByUserId,
			label: this.props.label.getValue(),
			keyPrefix: `drp_app_...${this.props.keyHash.getValue().slice(-8)}`,
			bifrostVirtualKeyId: this.props.bifrostVirtualKeyId,
			status: this.props.status.getValue(),
			scope: this.props.scope.getValue(),
			rotationPolicy: this.props.rotationPolicy.toJSON(),
			boundModules: this.props.boundModules.toJSON(),
			isInGracePeriod: this.props.gracePeriodEndsAt != null,
			gracePeriodEndsAt: this.props.gracePeriodEndsAt?.toISOString() ?? null,
			expiresAt: this.props.expiresAt?.toISOString() ?? null,
			revokedAt: this.props.revokedAt?.toISOString() ?? null,
			createdAt: this.props.createdAt.toISOString(),
			updatedAt: this.props.updatedAt.toISOString(),
		}
	}
}
