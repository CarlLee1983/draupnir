import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '../InertiaService'
import { requireAdmin } from './helpers/requireAdmin'

interface SyncStatus {
  enabled: boolean
  lastSyncAt: string | null
  nextSyncAt: string | null
  lastCursor: string | null
  totalRecordsProcessed: number
  lastError: string | null
}

export class AdminUsageSyncPage {
  constructor(private readonly inertia: InertiaService) {}

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
      message: 'UsageSync 模組尚未啟用（Phase 4 待完成）',
    })
  }
}
