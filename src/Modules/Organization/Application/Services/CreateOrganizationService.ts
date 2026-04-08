import { v4 as uuidv4 } from 'uuid'
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { IOrganizationRepository } from '../../Domain/Repositories/IOrganizationRepository'
import type { IOrganizationMemberRepository } from '../../Domain/Repositories/IOrganizationMemberRepository'
import type { IAuthRepository } from '@/Modules/Auth/Domain/Repositories/IAuthRepository'
import { Organization } from '../../Domain/Aggregates/Organization'
import { OrganizationMember } from '../../Domain/Entities/OrganizationMember'
import type { CreateOrganizationRequest, OrganizationResponse } from '../DTOs/OrganizationDTO'

export class CreateOrganizationService {
	constructor(
		private orgRepository: IOrganizationRepository,
		private memberRepository: IOrganizationMemberRepository,
		private authRepository: IAuthRepository,
		private db: IDatabaseAccess,
	) {}

	async execute(request: CreateOrganizationRequest): Promise<OrganizationResponse> {
		try {
			if (!request.name || !request.name.trim()) {
				return { success: false, message: '組織名稱不能為空', error: 'NAME_REQUIRED' }
			}

			const manager = await this.authRepository.findById(request.managerUserId)
			if (!manager) {
				return { success: false, message: '指定的 Manager 不存在', error: 'MANAGER_NOT_FOUND' }
			}

			const existingMembership = await this.memberRepository.findByUserId(request.managerUserId)
			if (existingMembership) {
				return { success: false, message: '該使用者已屬於其他組織', error: 'USER_ALREADY_IN_ORG' }
			}

			const orgId = uuidv4()
			const org = Organization.create(orgId, request.name, request.description || '', request.slug)

			const existingSlug = await this.orgRepository.findBySlug(org.slug)
			if (existingSlug) {
				return { success: false, message: '此 slug 已被使用', error: 'SLUG_EXISTS' }
			}

			await this.db.transaction(async (tx) => {
				const txOrgRepo = this.orgRepository.withTransaction(tx)
				const txMemberRepo = this.memberRepository.withTransaction(tx)
				await txOrgRepo.save(org)
				const member = OrganizationMember.create(uuidv4(), orgId, request.managerUserId, 'manager')
				await txMemberRepo.save(member)
			})

			return { success: true, message: '組織建立成功', data: org.toDTO() }
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : '建立失敗'
			return { success: false, message, error: message }
		}
	}
}
