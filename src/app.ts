/**
 * 應用建立函式 (createApp)
 *
 * 包裝 bootstrap 函式，提供給 src/index.ts 使用
 * 負責：
 * 1. 從配置取得連接埠號
 * 2. 調用 bootstrap 初始化應用
 * 3. 返回已初始化的 PlanetCore 實例
 */

import bootstrap from './bootstrap'

/**
 * 建立並初始化應用
 *
 * @returns {Promise<PlanetCore>} 初始化完成的 Gravito 核心實例
 */
export async function createApp() {
	// 從環境變數或預設值取得連接埠
	const port = (process.env.PORT as unknown as number) || 3000

	// 執行完整的啟動流程
	const core = await bootstrap(port)

	return core
}
