import type { IAppApiKeyRepository } from '../../Domain/Repositories/IAppApiKeyRepository'
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import type { AppKeyBifrostSync } from '../../Infrastructure/Services/AppKeyBifrostSync'
import type { RevokeAppKeyRequest, AppApiKeyResponse } from '../DTOs/AppApiKeyDTO'

export class RevokeAppKeyService {
	constructor(
		private readonly appApiKeyRepository: IAppApiKeyRepository,
		private readonly orgAuth: OrgAuthorizationHelper,
		private readonly bifrostSync: AppKeyBifrostSync,
	) {}

	async execute(request: RevokeAppKeyRequest): Promise<AppApiKeyResponse> {
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

			await this.bifrostSync.deactivateVirtualKey(key.bifrostVirtualKeyId)
			if (key.previousBifrostVirtualKeyId) {
				await this.bifrostSync.deactivateVirtualKey(key.previousBifrostVirtualKeyId)
			}

			const revoked = key.revoke()
			await this.appApiKeyRepository.update(revoked)

			return { success: true, message: 'App Key 已撤銷', data: revoked.toDTO() }
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : '撤銷失敗'
			return { success: false, message, error: message }
		}
	}
}
