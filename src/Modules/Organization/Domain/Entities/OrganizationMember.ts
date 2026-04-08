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

	get id(): string {
		return this.props.id
	}
	get organizationId(): string {
		return this.props.organizationId
	}
	get userId(): string {
		return this.props.userId
	}
	get role(): string {
		return this.props.role
	}
	get joinedAt(): Date {
		return this.props.joinedAt
	}
	get createdAt(): Date {
		return this.props.createdAt
	}

	isManager(): boolean {
		return this.props.role === 'manager'
	}

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
