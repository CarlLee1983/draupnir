// src/Modules/AppModule/Domain/CoreAppModules.ts
/** 內建 App 模組：名稱需與合約 allowedModules、ModuleAccessMiddleware 參數一致（小寫） */
export const CORE_APP_MODULE_SPECS = [
	{
		id: '00000000-0000-4000-8000-000000000001',
		name: 'dashboard',
		description: '組織儀表板與用量摘要',
	},
	{
		id: '00000000-0000-4000-8000-000000000002',
		name: 'credit',
		description: '點數餘額與交易紀錄',
	},
	{
		id: '00000000-0000-4000-8000-000000000003',
		name: 'api_keys',
		description: '組織 API 金鑰管理',
	},
] as const

export type CoreAppModuleName = (typeof CORE_APP_MODULE_SPECS)[number]['name']

export function coreAppModuleNames(): readonly string[] {
	return CORE_APP_MODULE_SPECS.map((s) => s.name)
}
