import type { IOrganizationRepository } from '../../Domain/Repositories/IOrganizationRepository'
import { type ListOrganizationsResponse, OrganizationPresenter } from '../DTOs/OrganizationDTO'

export class ListOrganizationsService {
  constructor(private orgRepository: IOrganizationRepository) {}

  async execute(page = 1, limit = 20): Promise<ListOrganizationsResponse> {
    try {
      const offset = (page - 1) * limit
      const [orgs, total] = await Promise.all([
        this.orgRepository.findAll(limit, offset),
        this.orgRepository.count(),
      ])

      return {
        success: true,
        message: 'Organizations retrieved successfully',
        data: {
          organizations: orgs.map((o) => OrganizationPresenter.fromEntity(o)),
          meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 0 },
        },
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Fetch failed'
      return { success: false, message, error: message }
    }
  }
}
