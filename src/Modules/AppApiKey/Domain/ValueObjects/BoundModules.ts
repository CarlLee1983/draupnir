export class BoundModules {
	private constructor(private readonly moduleIds: readonly string[]) {}

	static empty(): BoundModules {
		return new BoundModules([])
	}

	static from(moduleIds: string[]): BoundModules {
		const unique = [...new Set(moduleIds)]
		return new BoundModules(unique)
	}

	static fromJSON(json: string[]): BoundModules {
		return BoundModules.from(json)
	}

	getModuleIds(): readonly string[] {
		return this.moduleIds
	}

	isEmpty(): boolean {
		return this.moduleIds.length === 0
	}

	includes(moduleId: string): boolean {
		return this.moduleIds.includes(moduleId)
	}

	allowsAccess(moduleId: string): boolean {
		if (this.isEmpty()) return true
		return this.includes(moduleId)
	}

	toJSON(): string[] {
		return [...this.moduleIds]
	}
}
