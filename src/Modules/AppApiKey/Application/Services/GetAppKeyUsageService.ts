import type { IAppApiKeyRepository } from '../../Domain/Repositories/IAppApiKeyRepository'
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import type { BifrostClient } from '@/Foundation/Infrastructure/Services/BifrostClient/BifrostClient'
import type { GetAppKeyUsageRequest, AppApiKeyResponse } from '../DTOs/AppApiKeyDTO'

export class GetAppKeyUsageService {
	constructor(
		private readonly appApiKeyRepository: IAppApiKeyRepository,
		private readonly orgAuth: OrgAuthorizationHelper,
		private readonly bifrostClient: BifrostClient,
	) {}

	async execute(request: GetAppKeyUsageRequest): Promise<AppApiKeyResponse> {
		try {
			const key = await this.appApiKeyRepository.findById(request.keyId)
			if (!key) {
				return { success: false, message: 'App Key 不存在', error: 'KEY_NOT_FOUND' }
			}

			const authResult = await this.orgAuth.requireOrgMembership(
				key.orgId,
				request.callerUserId,
				request.callerSystemRole,
			)
			if (!authResult.authorized) {
				return {
					success: false,
					message: '你不是此組織的成員',
					error: authResult.error ?? 'NOT_ORG_MEMBER',
				}
			}

			const stats = await this.bifrostClient.getLogsStats({
				virtual_key_ids: key.bifrostVirtualKeyId,
				start_time: request.startDate,
				end_time: request.endDate,
			})

			return {
				success: true,
				message: '用量查詢成功',
				data: {
					keyId: key.id,
					label: key.label,
					totalRequests: stats.total_requests ?? 0,
					totalTokens: stats.total_tokens ?? 0,
					totalCost: stats.total_cost ?? 0,
				},
			}
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : '查詢失敗'
			return { success: false, message, error: message }
		}
	}
}
