import type { IAuthRepository } from '@/Modules/Auth/Domain/Repositories/IAuthRepository'
import type { IOrganizationInvitationRepository } from '../../Domain/Repositories/IOrganizationInvitationRepository'
import type { IOrganizationRepository } from '../../Domain/Repositories/IOrganizationRepository'

export interface PendingInvitationDTO {
  id: string
  organizationId: string
  organizationName: string
  role: string
  expiresAt: string
}

export class GetPendingInvitationsService {
  constructor(
    private invitationRepository: IOrganizationInvitationRepository,
    private authRepository: IAuthRepository,
    private orgRepository: IOrganizationRepository,
  ) {}

  async execute(userId: string): Promise<PendingInvitationDTO[]> {
    const user = await this.authRepository.findById(userId)
    if (!user) return []

    const invitations = await this.invitationRepository.findPendingByEmail(user.emailValue)

    const results: PendingInvitationDTO[] = []
    for (const inv of invitations) {
      const org = await this.orgRepository.findById(inv.organizationId)
      results.push({
        id: inv.id,
        organizationId: inv.organizationId,
        organizationName: org?.name ?? '',
        role: inv.role.getValue(),
        expiresAt: inv.expiresAt.toISOString(),
      })
    }
    return results
  }
}
