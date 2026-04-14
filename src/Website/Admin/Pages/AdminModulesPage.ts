import type { ListModulesService } from '@/Modules/AppModule/Application/Services/ListModulesService'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'
/**
 * Admin catalog of app modules (`Admin/Modules/Index`).
 */
export class AdminModulesPage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly listService: ListModulesService,
  ) {}

  /**
   * @returns Inertia list of modules or auth failure response.
   */
  async handle(ctx: IHttpContext): Promise<Response> {
    const result = await this.listService.execute()

    const modules =
      result.success && result.data
        ? result.data.map((m) => {
            const row = m as Record<string, unknown>
            const t = String(row.type ?? 'free')
            return {
              id: row.id as string,
              key: row.name as string,
              name: row.name as string,
              type: (t === 'paid' ? 'PAID' : 'FREE') as 'FREE' | 'PAID',
              description: String(row.description ?? ''),
            }
          })
        : []

    return this.inertia.render(ctx, 'Admin/Modules/Index', {
      modules,
      error: result.success ? null : { key: 'admin.modules.loadFailed' },
    })
  }
}
