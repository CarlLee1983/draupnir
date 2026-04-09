import { ApplicationStatus } from '../ValueObjects/ApplicationStatus'

interface ApplicationProps {
	readonly id: string
	readonly name: string
	readonly description: string
	readonly orgId: string
	readonly createdByUserId: string
	readonly status: ApplicationStatus
	readonly webhookUrl: string | null
	readonly webhookSecret: string | null
	readonly redirectUris: readonly string[]
	readonly createdAt: Date
	readonly updatedAt: Date
}

interface CreateApplicationParams {
	id: string
	name: string
	description: string
	orgId: string
	createdByUserId: string
	redirectUris?: string[]
}

function parseDate(value: unknown): Date {
	if (value instanceof Date) return value
	return new Date(value as string)
}

export class Application {
	private readonly props: ApplicationProps

	private constructor(props: ApplicationProps) {
		this.props = props
	}

	static create(params: CreateApplicationParams): Application {
		if (!params.name || params.name.trim().length === 0) {
			throw new Error('Application 名稱不能為空')
		}
		if (params.name.length > 255) {
			throw new Error('Application 名稱不能超過 255 字')
		}
		return new Application({
			id: params.id,
			name: params.name.trim(),
			description: params.description ?? '',
			orgId: params.orgId,
			createdByUserId: params.createdByUserId,
			status: ApplicationStatus.active(),
			webhookUrl: null,
			webhookSecret: null,
			redirectUris: params.redirectUris ?? [],
			createdAt: new Date(),
			updatedAt: new Date(),
		})
	}

	static fromDatabase(row: Record<string, unknown>): Application {
		const redirectUris: string[] =
			typeof row.redirect_uris === 'string'
				? JSON.parse(row.redirect_uris as string)
				: ((row.redirect_uris as string[]) ?? [])

		return new Application({
			id: row.id as string,
			name: row.name as string,
			description: (row.description as string) ?? '',
			orgId: row.org_id as string,
			createdByUserId: row.created_by_user_id as string,
			status: ApplicationStatus.from(row.status as string),
			webhookUrl: (row.webhook_url as string) ?? null,
			webhookSecret: (row.webhook_secret as string) ?? null,
			redirectUris,
			createdAt: parseDate(row.created_at),
			updatedAt: parseDate(row.updated_at),
		})
	}

	updateInfo(name: string, description: string): Application {
		if (this.props.status.isArchived()) {
			throw new Error('已封存的應用不能修改')
		}
		if (!name || name.trim().length === 0) {
			throw new Error('Application 名稱不能為空')
		}
		if (name.length > 255) {
			throw new Error('Application 名稱不能超過 255 字')
		}
		return new Application({
			...this.props,
			name: name.trim(),
			description,
			updatedAt: new Date(),
		})
	}

	setWebhook(url: string, secret: string): Application {
		if (!url.startsWith('https://')) {
			throw new Error('Webhook URL 必須使用 HTTPS')
		}
		return new Application({
			...this.props,
			webhookUrl: url,
			webhookSecret: secret,
			updatedAt: new Date(),
		})
	}

	clearWebhook(): Application {
		return new Application({
			...this.props,
			webhookUrl: null,
			webhookSecret: null,
			updatedAt: new Date(),
		})
	}

	updateRedirectUris(uris: string[]): Application {
		if (this.props.status.isArchived()) {
			throw new Error('已封存的應用不能修改')
		}
		return new Application({
			...this.props,
			redirectUris: [...uris],
			updatedAt: new Date(),
		})
	}

	suspend(): Application {
		return new Application({
			...this.props,
			status: ApplicationStatus.suspended(),
			updatedAt: new Date(),
		})
	}

	reactivate(): Application {
		if (this.props.status.isArchived()) {
			throw new Error('已封存的應用不能重新啟用')
		}
		return new Application({
			...this.props,
			status: ApplicationStatus.active(),
			updatedAt: new Date(),
		})
	}

	archive(): Application {
		return new Application({
			...this.props,
			status: ApplicationStatus.archived(),
			updatedAt: new Date(),
		})
	}

	get id(): string {
		return this.props.id
	}
	get name(): string {
		return this.props.name
	}
	get description(): string {
		return this.props.description
	}
	get orgId(): string {
		return this.props.orgId
	}
	get createdByUserId(): string {
		return this.props.createdByUserId
	}
	get status(): string {
		return this.props.status.getValue()
	}
	get webhookUrl(): string | null {
		return this.props.webhookUrl
	}
	get webhookSecret(): string | null {
		return this.props.webhookSecret
	}
	get redirectUris(): readonly string[] {
		return this.props.redirectUris
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
			name: this.props.name,
			description: this.props.description,
			org_id: this.props.orgId,
			created_by_user_id: this.props.createdByUserId,
			status: this.props.status.getValue(),
			webhook_url: this.props.webhookUrl,
			webhook_secret: this.props.webhookSecret,
			redirect_uris: JSON.stringify([...this.props.redirectUris]),
			created_at: this.props.createdAt.toISOString(),
			updated_at: this.props.updatedAt.toISOString(),
		}
	}

	toDTO(): Record<string, unknown> {
		return {
			id: this.props.id,
			name: this.props.name,
			description: this.props.description,
			orgId: this.props.orgId,
			createdByUserId: this.props.createdByUserId,
			status: this.props.status.getValue(),
			webhookUrl: this.props.webhookUrl,
			redirectUris: [...this.props.redirectUris],
			createdAt: this.props.createdAt.toISOString(),
			updatedAt: this.props.updatedAt.toISOString(),
		}
	}
}
