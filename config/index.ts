/**
 * Config 架構入口
 *
 * 集中匯出各模組設定，供 bootstrap 組裝 defineConfig。
 * - app: 應用名稱、環境、port、VIEW_DIR、debug、url
 * - database: Atlas ORM（ENABLE_DB !== 'false' 時使用）
 * - cache: Stasis 快取（可選）
 */

import appConfig from './app'
import cacheConfig from './cache'
import databaseConfig from './database'
import redisConfig from './redis'

export { default as app } from './app'
export { default as cache } from './cache'
export { default as database } from './database'
export { default as redis } from './redis'
export { getOrbits } from './orbits'

export type { AppConfig } from './types'
export type { OrbitRegistrationOptions } from './orbits'

/** 是否啟用資料庫（ENABLE_DB !== 'false'） */
const useDatabase = process.env.ENABLE_DB !== 'false'

/**
 * 組裝給 defineConfig 使用的 config 物件
 * @param portOverride - 覆寫 app.port（例如 CLI 傳入）
 */
export function buildConfig(portOverride?: number) {
	const port = portOverride ?? appConfig.port
	return {
		...appConfig,
		PORT: port,
		VIEW_DIR: appConfig.VIEW_DIR,
		...(useDatabase && { database: databaseConfig }),
		cache: cacheConfig,
		redis: redisConfig,
	}
}

export { useDatabase }
