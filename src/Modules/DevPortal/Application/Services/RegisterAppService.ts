import type { IApplicationRepository } from '../../Domain/Repositories/IApplicationRepository'
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import { Application } from '../../Domain/Aggregates/Application'
import type { RegisterAppRequest, RegisterAppResponse } from '../DTOs/RegisterAppDTO'

export class RegisterAppService {
	constructor(
		private readonly applicationRepository: IApplicationRepository,
		private readonly orgAuth: OrgAuthorizationHelper,
	) {}

	async execute(request: RegisterAppRequest): Promise<RegisterAppResponse> {
		try {
			if (!request.name || !request.name.trim()) {
				return { success: false, message: 'Application 名稱不能為空', error: 'NAME_REQUIRED' }
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

			const appId = crypto.randomUUID()
			const application = Application.create({
				id: appId,
				name: request.name,
				description: request.description ?? '',
				orgId: request.orgId,
				createdByUserId: request.createdByUserId,
				redirectUris: request.redirectUris,
			})

			await this.applicationRepository.save(application)

			return {
				success: true,
				message: 'Application 註冊成功',
				data: application.toDTO(),
			}
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : '註冊失敗'
			return { success: false, message, error: message }
		}
	}
}
