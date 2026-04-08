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
			.normalize('NFKD')
			.replace(/[\u0300-\u036f]/g, '')
			.toLowerCase()
			.trim()
			.replace(/[^\w\s-]/g, '')
			.replace(/\s+/g, '-')
			.replace(/-+/g, '-')
			.replace(/^-|-$/g, '')

		if (!slug) {
			const suffix = Math.random().toString(36).slice(2, 8)
			return new OrgSlug(`org-${suffix}`)
		}

		return new OrgSlug(slug)
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
