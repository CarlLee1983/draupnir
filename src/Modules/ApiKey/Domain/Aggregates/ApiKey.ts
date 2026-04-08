import { KeyHash } from '../ValueObjects/KeyHash'
import { KeyLabel } from '../ValueObjects/KeyLabel'
import { KeyStatus } from '../ValueObjects/KeyStatus'
import { KeyScope, type KeyScopeJSON } from '../ValueObjects/KeyScope'

interface ApiKeyProps {
	readonly id: string
	readonly orgId: string
	readonly createdByUserId: string
	readonly label: KeyLabel
	readonly keyHash: KeyHash
	readonly bifrostVirtualKeyId: string
	readonly status: KeyStatus
	readonly scope: KeyScope
	readonly expiresAt: Date | null
	readonly revokedAt: Date | null
	readonly createdAt: Date
	readonly updatedAt: Date
}

interface CreateApiKeyParams {
	id: string
	orgId: string
	createdByUserId: string
	label: string
	bifrostVirtualKeyId: string
	rawKey: string
	scope?: KeyScope
	expiresAt?: Date | null
}

export class ApiKey {
	private readonly props: ApiKeyProps

	private constructor(props: ApiKeyProps) {
		this.props = props
	}

	static async create(params: CreateApiKeyParams): Promise<ApiKey> {
		const keyHash = await KeyHash.fromRawKey(params.rawKey)
		return new ApiKey({
			id: params.id,
			orgId: params.orgId,
			createdByUserId: params.createdByUserId,
			label: new KeyLabel(params.label),
			keyHash,
			bifrostVirtualKeyId: params.bifrostVirtualKeyId,
			status: KeyStatus.pending(),
			scope: params.scope ?? KeyScope.unrestricted(),
			expiresAt: params.expiresAt ?? null,
			revokedAt: null,
			createdAt: new Date(),
			updatedAt: new Date(),
		})
	}

	static fromDatabase(row: Record<string, unknown>): ApiKey {
		const scopeJson: KeyScopeJSON =
			typeof row.scope === 'string' ? JSON.parse(row.scope as string) : (row.scope as KeyScopeJSON)

		return new ApiKey({
			id: row.id as string,
			orgId: row.org_id as string,
			createdByUserId: row.created_by_user_id as string,
			label: new KeyLabel(row.label as string),
			keyHash: KeyHash.fromExisting(row.key_hash as string),
			bifrostVirtualKeyId: row.bifrost_virtual_key_id as string,
			status: KeyStatus.from(row.status as string),
			scope: KeyScope.fromJSON(scopeJson),
			expiresAt: row.expires_at ? new Date(row.expires_at as string) : null,
			revokedAt: row.revoked_at ? new Date(row.revoked_at as string) : null,
			createdAt: new Date(row.created_at as string),
			updatedAt: new Date(row.updated_at as string),
		})
	}

	activate(): ApiKey {
		if (!this.props.status.isPending()) {
			throw new Error('只有 pending 狀態的 Key 可以 activate')
		}
		return new ApiKey({
			...this.props,
			status: KeyStatus.active(),
			updatedAt: new Date(),
		})
	}

	revoke(): ApiKey {
		if (this.props.status.isRevoked()) {
			throw new Error('此 Key 已撤銷')
		}
		if (this.props.status.isPending()) {
			throw new Error('pending 狀態的 Key 不能撤銷，請先 activate 或直接刪除')
		}
		return new ApiKey({
			...this.props,
			status: KeyStatus.revoked(),
			revokedAt: new Date(),
			updatedAt: new Date(),
		})
	}

	updateLabel(newLabel: string): ApiKey {
		return new ApiKey({
			...this.props,
			label: new KeyLabel(newLabel),
			updatedAt: new Date(),
		})
	}

	updateScope(newScope: KeyScope): ApiKey {
		if (this.props.status.isRevoked()) {
			throw new Error('已撤銷的 Key 不能更新權限')
		}
		return new ApiKey({
			...this.props,
			scope: newScope,
			updatedAt: new Date(),
		})
	}

	get id(): string {
		return this.props.id
	}
	get orgId(): string {
		return this.props.orgId
	}
	get createdByUserId(): string {
		return this.props.createdByUserId
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
	get scope(): KeyScope {
		return this.props.scope
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
			created_by_user_id: this.props.createdByUserId,
			label: this.props.label.getValue(),
			key_hash: this.props.keyHash.getValue(),
			bifrost_virtual_key_id: this.props.bifrostVirtualKeyId,
			status: this.props.status.getValue(),
			scope: JSON.stringify(this.props.scope.toJSON()),
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
			createdByUserId: this.props.createdByUserId,
			label: this.props.label.getValue(),
			keyPrefix: `drp_sk_...${this.props.keyHash.getValue().slice(-8)}`,
			bifrostVirtualKeyId: this.props.bifrostVirtualKeyId,
			status: this.props.status.getValue(),
			scope: this.props.scope.toJSON(),
			expiresAt: this.props.expiresAt?.toISOString() ?? null,
			revokedAt: this.props.revokedAt?.toISOString() ?? null,
			createdAt: this.props.createdAt.toISOString(),
			updatedAt: this.props.updatedAt.toISOString(),
		}
	}
}
