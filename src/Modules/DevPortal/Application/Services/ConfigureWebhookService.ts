import type { IApplicationRepository } from '../../Domain/Repositories/IApplicationRepository'
import type { IWebhookConfigRepository } from '../../Domain/Repositories/IWebhookConfigRepository'
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import { WebhookConfig } from '../../Domain/Entities/WebhookConfig'
import { WebhookSecret } from '../../Domain/ValueObjects/WebhookSecret'
import { WebhookEventType } from '../../Domain/ValueObjects/WebhookEventType'
import type { ConfigureWebhookRequest, ConfigureWebhookResponse } from '../DTOs/WebhookConfigDTO'

export class ConfigureWebhookService {
	constructor(
		private readonly applicationRepository: IApplicationRepository,
		private readonly webhookConfigRepository: IWebhookConfigRepository,
		private readonly orgAuth: OrgAuthorizationHelper,
	) {}

	async execute(request: ConfigureWebhookRequest): Promise<ConfigureWebhookResponse> {
		try {
			const application = await this.applicationRepository.findById(request.applicationId)
			if (!application) {
				return { success: false, message: 'Application 不存在', error: 'APP_NOT_FOUND' }
			}

			const authResult = await this.orgAuth.requireOrgMembership(
				application.orgId,
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

			for (const eventType of request.eventTypes) {
				WebhookEventType.from(eventType)
			}

			const secret = WebhookSecret.generate()
			const updatedApp = application.setWebhook(request.webhookUrl, secret.getValue())
			await this.applicationRepository.update(updatedApp)

			await this.webhookConfigRepository.deleteByApplicationId(request.applicationId)

			for (const eventType of request.eventTypes) {
				const config = WebhookConfig.create({
					id: crypto.randomUUID(),
					applicationId: request.applicationId,
					eventType,
				})
				await this.webhookConfigRepository.save(config)
			}

			return {
				success: true,
				message: 'Webhook 設定成功',
				data: {
					webhookUrl: request.webhookUrl,
					webhookSecret: secret.getValue(),
					subscribedEvents: [...request.eventTypes],
				},
			}
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : '設定失敗'
			return { success: false, message, error: message }
		}
	}
}
