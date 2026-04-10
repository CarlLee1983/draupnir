import type { IOrganizationRepository } from '../../Domain/Repositories/IOrganizationRepository'
import { OrganizationPresenter, type ListOrganizationsResponse } from '../DTOs/OrganizationDTO'

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
        message: '取得組織列表成功',
        data: {
          organizations: orgs.map((o) => OrganizationPresenter.fromEntity(o)),
          meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 0 },
        },
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '取得失敗'
      return { success: false, message, error: message }
    }
  }
}
