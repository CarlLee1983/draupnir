import { toHistoryDTO } from '@/Modules/Alerts/Application/DTOs/AlertHistoryDTO'
import { toListDTO } from '@/Modules/Alerts/Application/DTOs/WebhookEndpointDTO'
import type { GetAlertHistoryService } from '@/Modules/Alerts/Application/Services/GetAlertHistoryService'
import type { GetBudgetService } from '@/Modules/Alerts/Application/Services/GetBudgetService'
import type { ListWebhookEndpointsService } from '@/Modules/Alerts/Application/Services/ListWebhookEndpointsService'
import type { CurrentOrganizationContext } from '@/Modules/Organization/Presentation/Middleware/OrganizationMiddleware'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '../InertiaService'
import { requireMember } from './helpers/requireMember'

/**
 * Member alerts hub for the selected organization (`Member/Alerts/Index`).
 */
export class MemberAlertsPage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly getBudgetService: GetBudgetService,
    private readonly listWebhookEndpointsService: ListWebhookEndpointsService,
    private readonly getAlertHistoryService: GetAlertHistoryService,
  ) {}

  async handle(ctx: IHttpContext): Promise<Response> {
    const check = requireMember(ctx)
    if (!check.ok) return check.response!

    const currentOrg = ctx.get<CurrentOrganizationContext>('currentOrg')
    const orgId =
      currentOrg?.organizationId ?? ctx.getQuery('orgId') ?? ctx.getHeader('X-Organization-Id')
    const shared = ctx.get('inertia:shared') as
      | {
          locale: 'zh-TW' | 'en'
          messages: Record<string, string>
        }
      | undefined
    const messages = shared?.messages ?? {}

    if (!orgId) {
      return this.inertia.render(ctx, 'Member/Alerts/Index', {
        orgId: null,
        budget: null,
        webhookEndpoints: [],
        alertHistory: [],
        error: messages['member.alerts.selectOrg'] ?? 'Select an organization to view alerts.',
      })
    }

    const [budgetResult, endpoints, history] = await Promise.all([
      this.getBudgetService.execute(orgId),
      this.listWebhookEndpointsService.list(orgId),
      this.getAlertHistoryService.list(orgId, { limit: 50, offset: 0 }),
    ])

    return this.inertia.render(ctx, 'Member/Alerts/Index', {
      orgId,
      budget: budgetResult.data
        ? {
            budgetUsd: budgetResult.data.budgetUsd,
            warningPct: 80,
            criticalPct: 100,
          }
        : null,
      webhookEndpoints: endpoints.map(toListDTO),
      alertHistory: history.map(({ event, deliveries }) => toHistoryDTO(event, deliveries)),
      error: null,
    })
  }
}
