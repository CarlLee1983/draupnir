/**
 * 當前應用使用的 IDatabaseAccess 映射
 *
 * 由 bootstrap 設定一次，各 Module ServiceProvider 需要時透過 getCurrentDatabaseAccess() 取得，
 * 無需由 bootstrap 逐一注入，新增需 DB 的模組時不必改 bootstrap 的註冊參數。
 */

import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'

let current: IDatabaseAccess | null = null

/**
 * 設定當前應用的 IDatabaseAccess（僅由 bootstrap 呼叫一次）
 */
export function setCurrentDatabaseAccess(db: IDatabaseAccess): void {
	current = db
}

/**
 * 取得當前應用的 IDatabaseAccess
 *
 * 供各 Module ServiceProvider 在 register() 內取得，用於註冊 Repository 工廠等。
 * 若尚未設定則拋錯（表示 bootstrap 未正確呼叫 setCurrentDatabaseAccess）。
 */
export function getCurrentDatabaseAccess(): IDatabaseAccess {
	if (current === null) {
		throw new Error(
			'IDatabaseAccess 尚未設定。請在 bootstrap 中於註冊 ServiceProvider 之前呼叫 setCurrentDatabaseAccess(db)。'
		)
	}
	return current
}

/**
 * 是否已設定當前 IDatabaseAccess（測試或可選依賴時可用）
 */
export function hasCurrentDatabaseAccess(): boolean {
	return current !== null
}
