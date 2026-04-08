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
