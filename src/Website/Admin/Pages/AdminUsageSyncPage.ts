import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'

/** Placeholder sync metrics until UsageSync is fully implemented. */
interface SyncStatus {
  enabled: boolean
  lastSyncedAt: string | null
  nextSyncAt: string | null
  processedCount: number
  lastError: string | null
}

/**
 * Admin usage sync status placeholder (`Admin/UsageSync/Index`).
 */
export class AdminUsageSyncPage {
  constructor(private readonly inertia: InertiaService) {}

  /**
   * @returns Static placeholder props until Phase 4 UsageSync is enabled.
   */
  async handle(ctx: IHttpContext): Promise<Response> {
    const status: SyncStatus = {
      enabled: false,
      lastSyncedAt: null,
      nextSyncAt: null,
      processedCount: 0,
      lastError: null,
    }

    return this.inertia.render(ctx, 'Admin/UsageSync/Index', {
      status,
      error: null,
    })
  }
}
