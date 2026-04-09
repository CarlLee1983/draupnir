import type { IAppApiKeyRepository } from '../../Domain/Repositories/IAppApiKeyRepository'
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import type { AppKeyBifrostSync } from '../../Infrastructure/Services/AppKeyBifrostSync'
import { AppApiKey } from '../../Domain/Aggregates/AppApiKey'
import { AppKeyScope } from '../../Domain/ValueObjects/AppKeyScope'
import { KeyRotationPolicy } from '../../Domain/ValueObjects/KeyRotationPolicy'
import { BoundModules } from '../../Domain/ValueObjects/BoundModules'
import type { IssueAppKeyRequest, AppApiKeyCreatedResponse } from '../DTOs/AppApiKeyDTO'

export class IssueAppKeyService {
	constructor(
		private readonly appApiKeyRepository: IAppApiKeyRepository,
		private readonly orgAuth: OrgAuthorizationHelper,
		private readonly bifrostSync: AppKeyBifrostSync,
	) {}

	async execute(request: IssueAppKeyRequest): Promise<AppApiKeyCreatedResponse> {
		try {
			if (!request.label || !request.label.trim()) {
				return { success: false, message: 'Key 標籤不能為空', error: 'LABEL_REQUIRED' }
			}

			const authResult = await this.orgAuth.requireOrgMembership(
				request.orgId,
				request.issuedByUserId,
				request.callerSystemRole,
			)
			if (!authResult.authorized) {
				return {
					success: false,
					message: '你不是此組織的成員',
					error: authResult.error ?? 'NOT_ORG_MEMBER',
				}
			}

			const scope = request.scope ? AppKeyScope.from(request.scope) : AppKeyScope.read()

			const rotationPolicy = request.rotationPolicy?.autoRotate
				? KeyRotationPolicy.auto(
						request.rotationPolicy.rotationIntervalDays ?? 90,
						request.rotationPolicy.gracePeriodHours ?? 24,
					)
				: KeyRotationPolicy.manual(request.rotationPolicy?.gracePeriodHours)

			const boundModules = request.boundModuleIds
				? BoundModules.from(request.boundModuleIds)
				: BoundModules.empty()

			const keyId = crypto.randomUUID()
			const rawKey = `drp_app_${crypto.randomUUID().replace(/-/g, '')}`

			const pendingKey = await AppApiKey.create({
				id: keyId,
				orgId: request.orgId,
				issuedByUserId: request.issuedByUserId,
				label: request.label,
				bifrostVirtualKeyId: '',
				rawKey,
				scope,
				rotationPolicy,
				boundModules,
				expiresAt: request.expiresAt ? new Date(request.expiresAt) : null,
			})
			await this.appApiKeyRepository.save(pendingKey)

			try {
				const { bifrostVirtualKeyId } = await this.bifrostSync.createVirtualKey(
					request.label,
					request.orgId,
				)

				const activatedKey = await AppApiKey.create({
					id: keyId,
					orgId: request.orgId,
					issuedByUserId: request.issuedByUserId,
					label: request.label,
					bifrostVirtualKeyId,
					rawKey,
					scope,
					rotationPolicy,
					boundModules,
					expiresAt: request.expiresAt ? new Date(request.expiresAt) : null,
				})
				const finalKey = activatedKey.activate()
				await this.appApiKeyRepository.update(finalKey)

				return {
					success: true,
					message: 'App API Key 配發成功（請立即記錄 rawKey，此後將無法再次取得）',
					data: { ...finalKey.toDTO(), rawKey },
				}
			} catch (bifrostError: unknown) {
				await this.appApiKeyRepository.delete(keyId)
				throw bifrostError
			}
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : '配發失敗'
			return { success: false, message, error: message }
		}
	}
}
