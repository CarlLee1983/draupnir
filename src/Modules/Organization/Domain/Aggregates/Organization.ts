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

	get id(): string {
		return this.props.id
	}
	get name(): string {
		return this.props.name
	}
	get slug(): string {
		return this.props.slug
	}
	get description(): string {
		return this.props.description
	}
	get status(): string {
		return this.props.status
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
