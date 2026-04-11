import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '../InertiaService'
import { requireAdmin } from './helpers/requireAdmin'

/** Placeholder sync metrics until UsageSync is fully implemented. */
interface SyncStatus {
  enabled: boolean
  lastSyncAt: string | null
  nextSyncAt: string | null
  lastCursor: string | null
  totalRecordsProcessed: number
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
    const check = requireAdmin(ctx)
    if (!check.ok) return check.response!

    const status: SyncStatus = {
      enabled: false,
      lastSyncAt: null,
      nextSyncAt: null,
      lastCursor: null,
      totalRecordsProcessed: 0,
      lastError: null,
    }

    return this.inertia.render(ctx, 'Admin/UsageSync/Index', {
      status,
      message: 'UsageSync module is not enabled yet (Phase 4 pending completion)',
    })
  }
}
