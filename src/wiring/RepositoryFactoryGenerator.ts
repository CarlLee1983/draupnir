/**
 * Repository Factory Generator - 消除重複的工廠函數
 *
 * 問題：
 * ```typescript
 * // registerUserRepositories.ts
 * function createUserRepository(orm: string, db?: IDatabaseAccess): any {
 *   switch (orm) {
 *     case 'memory': return new UserRepository()
 *     case 'drizzle': return new DrizzleUserRepository(db!)
 *   }
 * }
 *
 * // registerPostRepositories.ts
 * function createPostRepository(orm: string, db?: IDatabaseAccess): any {
 *   switch (orm) {
 *     case 'memory': return new PostRepository()
 *     case 'drizzle': return new DrizzlePostRepository(db!)
 *   }
 * }
 * // 80% 重複代碼！
 * ```
 *
 * 解決方案：
 * 使用 createRepositoryFactory 生成器，傳入 Repository 類的映射
 *
 * ```typescript
 * const userFactory = createRepositoryFactory({
 *   memory: () => new UserRepository(),
 *   drizzle: (db) => new DrizzleUserRepository(db!),
 *   atlas: (db) => new AtlasUserRepository(db!),
 *   prisma: (db) => new PrismaUserRepository(db!),
 * })
 *
 * registry.register('user', userFactory)
 * ```
 *
 * 優勢：
 * ✅ 消除所有重複代碼
 * ✅ 簡潔清晰
 * ✅ 類型安全
 * ✅ 易於擴展（新增 ORM 時只改映射）
 */

import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'

/**
 * Repository 工廠映射類型
 * 為每個 ORM 提供一個工廠函數
 *
 * @example
 * {
 *   memory: () => new UserRepository(),
 *   drizzle: (db) => new DrizzleUserRepository(db!),
 *   atlas: (db) => new AtlasUserRepository(db!),
 *   prisma: (db) => new PrismaUserRepository(db!),
 * }
 */
export type RepositoryFactoryMap = {
	memory?: () => any
	drizzle?: (db: IDatabaseAccess) => any
	atlas?: (db: IDatabaseAccess) => any
	prisma?: (db: IDatabaseAccess) => any
}

/**
 * 生成通用的 Repository 工廠函數
 *
 * 消除重複的工廠代碼，使用配置驅動的方式生成工廠
 *
 * @param factoryMap Repository 工廠的映射
 * @returns 通用的工廠函數
 *
 * @example
 * const userFactory = createRepositoryFactory({
 *   memory: () => new UserRepository(),
 *   drizzle: (db) => new DrizzleUserRepository(db!),
 * })
 *
 * registry.register('user', userFactory)
 */
export function createRepositoryFactory(factoryMap: RepositoryFactoryMap) {
	return (orm: string, db: IDatabaseAccess | undefined): any => {
		// 根據 ORM 類型選擇工廠
		const factory = factoryMap[orm as keyof RepositoryFactoryMap]

		if (!factory) {
			throw new Error(
				`❌ Repository 不支援 ORM "${orm}"。\n` +
					`已支援：${Object.keys(factoryMap).join(', ')}`
			)
		}

		// 調用工廠函數
		// memory 不需要 db，其他 ORM 需要 db
		if (orm === 'memory') {
			return (factory as () => any)()
		} else {
			if (!db) {
				throw new Error(
					`❌ ORM="${orm}" 需要 DatabaseAccess，但未提供`
				)
			}
			return (factory as (db: IDatabaseAccess) => any)(db)
		}
	}
}

/**
 * 批量註冊 Repository 工廠
 *
 * 進一步簡化：一次性註冊多個模組的工廠
 *
 * @example
 * registerRepositoriesInBatch({
 *   user: userFactoryMap,
 *   post: postFactoryMap,
 *   order: orderFactoryMap,
 * })
 */
export function registerRepositoriesInBatch(
	repositoryMaps: Record<string, RepositoryFactoryMap>
): void {
	const { getRegistry } = require('@/wiring/RepositoryRegistry')
	const registry = getRegistry()

	for (const [type, factoryMap] of Object.entries(repositoryMaps)) {
		const factory = createRepositoryFactory(factoryMap)
		registry.register(type, factory)
		console.log(`✅ [${type.charAt(0).toUpperCase() + type.slice(1)}] Repository 工廠已註冊`)
	}
}

/**
 * 使用方式摘要
 *
 * 方式 1：分別註冊（推薦，清晰）
 * ```typescript
 * // src/Modules/User/Infrastructure/Providers/registerUserRepositories.ts
 * import { createRepositoryFactory } from '@/wiring/RepositoryFactoryGenerator'
 *
 * export function registerUserRepositories(): void {
 *   const factory = createRepositoryFactory({
 *     memory: () => new UserRepository(),
 *     drizzle: (db) => new DrizzleUserRepository(db!),
 *   })
 *   getRegistry().register('user', factory)
 * }
 * ```
 *
 * 方式 2：批量註冊（簡潔）
 * ```typescript
 * // src/bootstrap.ts
 * import { registerRepositoriesInBatch } from '@/wiring/RepositoryFactoryGenerator'
 *
 * registerRepositoriesInBatch({
 *   user: {
 *     memory: () => new UserRepository(),
 *     drizzle: (db) => new DrizzleUserRepository(db!),
 *   },
 *   post: {
 *     memory: () => new PostRepository(),
 *     drizzle: (db) => new DrizzlePostRepository(db!),
 *   },
 * })
 * ```
 */
