import type { IApiKeyRepository } from '../../Domain/Repositories/IApiKeyRepository'
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import type { ApiKeyBifrostSync } from '../../Infrastructure/Services/ApiKeyBifrostSync'
import { ApiKey } from '../../Domain/Aggregates/ApiKey'
import { KeyScope } from '../../Domain/ValueObjects/KeyScope'
import type { CreateApiKeyRequest, ApiKeyCreatedResponse } from '../DTOs/ApiKeyDTO'

export class CreateApiKeyService {
	constructor(
		private readonly apiKeyRepository: IApiKeyRepository,
		private readonly orgAuth: OrgAuthorizationHelper,
		private readonly bifrostSync: ApiKeyBifrostSync,
	) {}

	async execute(request: CreateApiKeyRequest): Promise<ApiKeyCreatedResponse> {
		try {
			if (!request.label || !request.label.trim()) {
				return { success: false, message: 'Key 標籤不能為空', error: 'LABEL_REQUIRED' }
			}

			const authResult = await this.orgAuth.requireOrgMembership(
				request.orgId,
				request.createdByUserId,
				request.callerSystemRole,
			)
			if (!authResult.authorized) {
				return {
					success: false,
					message: '你不是此組織的成員',
					error: authResult.error ?? 'NOT_ORG_MEMBER',
				}
			}

			const scope = KeyScope.create({
				allowedModels: request.allowedModels,
				rateLimitRpm: request.rateLimitRpm,
				rateLimitTpm: request.rateLimitTpm,
			})

			const keyId = crypto.randomUUID()
			const rawKey = `drp_sk_${crypto.randomUUID().replace(/-/g, '')}`

			const pendingKey = await ApiKey.create({
				id: keyId,
				orgId: request.orgId,
				createdByUserId: request.createdByUserId,
				label: request.label,
				bifrostVirtualKeyId: '',
				rawKey,
				scope,
				expiresAt: request.expiresAt ? new Date(request.expiresAt) : null,
			})
			await this.apiKeyRepository.save(pendingKey)

			try {
				const { bifrostVirtualKeyId } = await this.bifrostSync.createVirtualKey(
					request.label,
					request.orgId,
				)

				const activatedKey = await ApiKey.create({
					id: keyId,
					orgId: request.orgId,
					createdByUserId: request.createdByUserId,
					label: request.label,
					bifrostVirtualKeyId,
					rawKey,
					scope,
					expiresAt: request.expiresAt ? new Date(request.expiresAt) : null,
				})
				const finalKey = activatedKey.activate()
				await this.apiKeyRepository.update(finalKey)

				if (scope.getAllowedModels() != null || scope.getRateLimitRpm() != null || scope.getRateLimitTpm() != null) {
					await this.bifrostSync.syncPermissions(bifrostVirtualKeyId, scope)
				}

				return {
					success: true,
					message: 'API Key 建立成功（請立即記錄 rawKey，此後將無法再次取得）',
					data: { ...finalKey.toDTO(), rawKey },
				}
			} catch (bifrostError: unknown) {
				const activatedEntry = await this.apiKeyRepository.findById(keyId)
				const virtualKeyId = activatedEntry?.toDTO().bifrostVirtualKeyId
				if (virtualKeyId) {
					await this.bifrostSync.deleteVirtualKey(virtualKeyId).catch(() => {})
				}
				await this.apiKeyRepository.delete(keyId)
				throw bifrostError
			}
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : '建立失敗'
			return { success: false, message, error: message }
		}
	}
}
