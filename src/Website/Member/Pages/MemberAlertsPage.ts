import { toHistoryDTO } from '@/Modules/Alerts/Application/DTOs/AlertHistoryDTO'
import { toListDTO } from '@/Modules/Alerts/Application/DTOs/WebhookEndpointDTO'
import type { GetAlertHistoryService } from '@/Modules/Alerts/Application/Services/GetAlertHistoryService'
import type { GetBudgetService } from '@/Modules/Alerts/Application/Services/GetBudgetService'
import type { ListWebhookEndpointsService } from '@/Modules/Alerts/Application/Services/ListWebhookEndpointsService'
import type { GetUserMembershipService } from '@/Modules/Organization/Application/Services/GetUserMembershipService'
import type { CurrentOrganizationContext } from '@/Modules/Organization/Presentation/Middleware/OrganizationMiddleware'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'

/**
 * Page handler for member-area alerts.
 *
 * Path: `/member/alerts`
 * React Page: `Member/Alerts/Index`
 */
export class MemberAlertsPage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly getBudgetService: GetBudgetService,
    private readonly listWebhookEndpointsService: ListWebhookEndpointsService,
    private readonly getAlertHistoryService: GetAlertHistoryService,
    private readonly membershipService: GetUserMembershipService,
  ) {}

  /**
   * Renders the alerts hub with organization budget and history.
   *
   * @param ctx - Context providing organization and shared messages.
   * @returns Inertia render response.
   */
  async handle(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)!
    const currentOrg = ctx.get<CurrentOrganizationContext>('currentOrg')
    let orgId =
      currentOrg?.organizationId ??
      ctx.getQuery('orgId') ??
      ctx.getHeader('X-Organization-Id') ??
      null
    if (!orgId) {
      const membership = await this.membershipService.execute(auth.userId)
      orgId = membership?.orgId ?? null
    }

    if (!orgId) {
      return this.inertia.render(ctx, 'Member/Alerts/Index', {
        orgId: null,
        budget: null,
        webhookEndpoints: [],
        alertHistory: [],
        error: { key: 'member.alerts.selectOrg' },
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
