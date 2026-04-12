import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { CurrentOrganizationContext } from '@/Modules/Organization/Presentation/Middleware/OrganizationMiddleware'
import type { GetBudgetService } from '../../Application/Services/GetBudgetService'
import type { SetBudgetService } from '../../Application/Services/SetBudgetService'
import type { SetBudgetInput } from '../Requests/SetBudgetRequest'

/**
 * HTTP adapter for alert budget endpoints.
 */
export class AlertController {
  constructor(
    private readonly setBudgetService: SetBudgetService,
    private readonly getBudgetService: GetBudgetService,
  ) {}

  async setBudget(ctx: IHttpContext): Promise<Response> {
    const currentOrg = ctx.get<CurrentOrganizationContext>('currentOrg')
    if (!currentOrg) {
      return ctx.json({ success: false, message: 'Unauthorized', error: 'UNAUTHORIZED' }, 401)
    }

    if (!currentOrg.isAdmin && currentOrg.role !== 'manager') {
      return ctx.json({ success: false, message: 'Insufficient permissions', error: 'FORBIDDEN' }, 403)
    }

    const body = ctx.get('validated') as SetBudgetInput
    const result = await this.setBudgetService.execute(currentOrg.organizationId, body.budgetUsd)
    return ctx.json(result, result.success ? 200 : 400)
  }

  async getBudget(ctx: IHttpContext): Promise<Response> {
    const currentOrg = ctx.get<CurrentOrganizationContext>('currentOrg')
    if (!currentOrg) {
      return ctx.json({ success: false, message: 'Unauthorized', error: 'UNAUTHORIZED' }, 401)
    }

    const result = await this.getBudgetService.execute(currentOrg.organizationId)
    return ctx.json(result, 200)
  }
}
