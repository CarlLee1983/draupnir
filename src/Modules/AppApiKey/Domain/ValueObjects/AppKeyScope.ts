export const AppKeyScopeValues = ['read', 'write', 'admin'] as const
export type AppKeyScopeType = (typeof AppKeyScopeValues)[number]

export class AppKeyScope {
	private constructor(private readonly value: AppKeyScopeType) {}

	static read(): AppKeyScope {
		return new AppKeyScope('read')
	}

	static write(): AppKeyScope {
		return new AppKeyScope('write')
	}

	static admin(): AppKeyScope {
		return new AppKeyScope('admin')
	}

	static from(value: string): AppKeyScope {
		if (!AppKeyScopeValues.includes(value as AppKeyScopeType)) {
			throw new Error('無效的 App Key Scope')
		}
		return new AppKeyScope(value as AppKeyScopeType)
	}

	canRead(): boolean {
		return true
	}

	canWrite(): boolean {
		return this.value === 'write' || this.value === 'admin'
	}

	isAdmin(): boolean {
		return this.value === 'admin'
	}

	getValue(): AppKeyScopeType {
		return this.value
	}
}
