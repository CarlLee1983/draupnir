/**
 * CreateOrganizationService
 * Application service: handles the establishment of a new organization and its initial setup.
 *
 * Responsibilities:
 * - Validate organization name and slug availability
 * - Persist the organization aggregate
 * - Assign the establishing user as the 'manager' member
 * - Provision default application resources (credit accounts, etc.)
 * - Orchestrate atomic transaction for all setup steps
 */

import type { ProvisionOrganizationDefaultsService } from '@/Modules/AppModule/Application/Services/ProvisionOrganizationDefaultsService'
import type { IAuthRepository } from '@/Modules/Auth/Domain/Repositories/IAuthRepository'
import { RoleType } from '@/Modules/Auth/Domain/ValueObjects/Role'
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import { Organization } from '../../Domain/Aggregates/Organization'
import { OrganizationMember } from '../../Domain/Entities/OrganizationMember'
import type { IOrganizationMemberRepository } from '../../Domain/Repositories/IOrganizationMemberRepository'
import type { IOrganizationRepository } from '../../Domain/Repositories/IOrganizationRepository'
import { OrgMemberRole } from '../../Domain/ValueObjects/OrgMemberRole'
import {
  type CreateOrganizationRequest,
  OrganizationPresenter,
  type OrganizationResponse,
} from '../DTOs/OrganizationDTO'

/**
 * Service for establishing a new organization.
 */
export class CreateOrganizationService {
  constructor(
    private orgRepository: IOrganizationRepository,
    private memberRepository: IOrganizationMemberRepository,
    private authRepository: IAuthRepository,
    private db: IDatabaseAccess,
    private readonly provisionOrganizationDefaults: ProvisionOrganizationDefaultsService,
  ) {}

  /**
   * Executes the organization establishment process.
   */
  async execute(request: CreateOrganizationRequest): Promise<OrganizationResponse> {
    try {
      if (!request.name || !request.name.trim()) {
        return { success: false, message: 'Organization name is required', error: 'NAME_REQUIRED' }
      }

      const manager = await this.authRepository.findById(request.managerUserId)
      if (!manager) {
        return {
          success: false,
          message: 'Designated manager not found',
          error: 'MANAGER_NOT_FOUND',
        }
      }

      if (manager.role.isAdmin()) {
        return {
          success: false,
          message: 'Admin accounts cannot create organizations',
          error: 'ADMIN_CANNOT_CREATE_ORG',
        }
      }

      // v1 單組織：已具任何 membership（manager 或 member）者禁止建立新組織。
      const existingMembership = await this.memberRepository.findByUserId(request.managerUserId)
      if (existingMembership) {
        return {
          success: false,
          message: 'User already has an organization',
          error: 'ALREADY_HAS_ORGANIZATION',
        }
      }

      const orgId = crypto.randomUUID()
      const org = Organization.create(orgId, request.name, request.description || '', request.slug)

      const existingSlug = await this.orgRepository.findBySlug(org.slug)
      if (existingSlug) {
        return { success: false, message: 'This slug is already in use', error: 'SLUG_EXISTS' }
      }

      await this.db.transaction(async (tx) => {
        const txOrgRepo = this.orgRepository.withTransaction(tx)
        const txMemberRepo = this.memberRepository.withTransaction(tx)
        const txAuthRepo = this.authRepository.withTransaction(tx)
        await txOrgRepo.save(org)
        const member = OrganizationMember.create(
          crypto.randomUUID(),
          orgId,
          request.managerUserId,
          new OrgMemberRole('manager'),
        )
        await txMemberRepo.save(member)
        await txAuthRepo.updateRole(request.managerUserId, RoleType.MANAGER)
        // ProvisionOrganizationDefaultsService 不在此處執行，
        // 因為它持有原始 db 連線，不在 tx 範圍內。
      })

      // 移至 transaction 外：provisioning 是冪等的，失敗不影響 org 一致性。
      await this.provisionOrganizationDefaults.execute(orgId, request.managerUserId)

      return {
        success: true,
        message: 'Organization established successfully',
        data: OrganizationPresenter.fromEntity(org),
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Establishment failed'
      return { success: false, message, error: message }
    }
  }
}
