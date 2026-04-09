import type { IApplicationRepository } from '../../Domain/Repositories/IApplicationRepository'
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import type { ManageAppKeysRequest, ManageAppKeysResponse } from '../DTOs/WebhookConfigDTO'

export interface IIssueAppKeyService {
	execute(request: {
		orgId: string
		issuedByUserId: string
		callerSystemRole: string
		label: string
		scope?: string
		boundModuleIds?: string[]
	}): Promise<{ success: boolean; message: string; data?: Record<string, unknown>; error?: string }>
}

export interface IRevokeAppKeyService {
	execute(request: {
		keyId: string
		callerUserId: string
		callerSystemRole: string
	}): Promise<{ success: boolean; message: string; error?: string }>
}

export interface IListAppKeysService {
	execute(
		orgId: string,
		callerUserId: string,
		callerSystemRole: string,
		page?: number,
		limit?: number,
	): Promise<{ success: boolean; message?: string; data?: Record<string, unknown>; error?: string }>
}

export class ManageAppKeysService {
	constructor(
		private readonly applicationRepository: IApplicationRepository,
		private readonly orgAuth: OrgAuthorizationHelper,
		private readonly issueAppKeyService: IIssueAppKeyService,
		private readonly revokeAppKeyService: IRevokeAppKeyService,
		private readonly listAppKeysService: IListAppKeysService,
	) {}

	async execute(request: ManageAppKeysRequest): Promise<ManageAppKeysResponse> {
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

			switch (request.action) {
				case 'issue': {
					const issueResult = await this.issueAppKeyService.execute({
						orgId: application.orgId,
						issuedByUserId: request.callerUserId,
						callerSystemRole: request.callerSystemRole,
						label: request.label ?? 'Unnamed Key',
						scope: request.scope,
						boundModuleIds: request.boundModules,
					})
					return {
						success: issueResult.success,
						message: issueResult.message,
						error: issueResult.error,
						data: issueResult.data,
					}
				}
				case 'revoke': {
					if (!request.keyId) {
						return { success: false, message: '缺少 keyId', error: 'KEY_ID_REQUIRED' }
					}
					const revokeResult = await this.revokeAppKeyService.execute({
						keyId: request.keyId,
						callerUserId: request.callerUserId,
						callerSystemRole: request.callerSystemRole,
					})
					return {
						success: revokeResult.success,
						message: revokeResult.message,
						error: revokeResult.error,
					}
				}
				case 'list': {
					const listResult = await this.listAppKeysService.execute(
						application.orgId,
						request.callerUserId,
						request.callerSystemRole,
					)
					return {
						success: listResult.success,
						message: listResult.message ?? 'App Keys 查詢成功',
						data: listResult.data,
						error: listResult.error,
					}
				}
				default:
					return { success: false, message: '無效的操作', error: 'INVALID_ACTION' }
			}
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : '操作失敗'
			return { success: false, message, error: message }
		}
	}
}
