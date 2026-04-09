import type { PlanetCore } from '@gravito/core'
import type { GravitoContext } from '@gravito/core'
import { readFileSync } from 'node:fs'

import { fromGravitoContext, type IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { attachJwt } from '@/Modules/Auth/Presentation/Middleware/RoleMiddleware'
import { InertiaService } from './InertiaService'
import { ViteTagHelper, type ViteManifest } from './ViteTagHelper'

// 替代 node:path.resolve() 的實現（包括路徑正規化）
function joinPath(...parts: string[]): string {
  const joined = parts.map((p) => p.replace(/\/$/, '')).join('/')
  // 簡單的路徑正規化：移除 "./" 和合併 "//"
  return joined
    .replace(/\/+/g, '/') // 合併多個斜杠
    .replace(/\/\.(?=\/|$)/g, '') // 移除 "/./"
}

// 用於路徑驗證的正規化函數
function normalizePath(path: string): string {
  // 更嚴格的路徑正規化，用於安全檢查
  const parts = path.split('/')
  const normalized = []
  for (const part of parts) {
    if (part === '' || part === '.') {
      continue
    }
    if (part === '..') {
      normalized.pop()
    } else {
      normalized.push(part)
    }
  }
  return normalized.join('/')
}
import { injectSharedData } from './SharedDataMiddleware'
import { AdminDashboardPage } from './Admin/AdminDashboardPage'
import { AdminUsersPage } from './Admin/AdminUsersPage'
import { AdminUserDetailPage } from './Admin/AdminUserDetailPage'
import { AdminOrganizationsPage } from './Admin/AdminOrganizationsPage'
import { AdminOrganizationDetailPage } from './Admin/AdminOrganizationDetailPage'
import { AdminContractsPage } from './Admin/AdminContractsPage'
import { AdminContractCreatePage } from './Admin/AdminContractCreatePage'
import { AdminContractDetailPage } from './Admin/AdminContractDetailPage'
import { AdminModulesPage } from './Admin/AdminModulesPage'
import { AdminModuleCreatePage } from './Admin/AdminModuleCreatePage'
import { AdminApiKeysPage } from './Admin/AdminApiKeysPage'
import { AdminUsageSyncPage } from './Admin/AdminUsageSyncPage'
import type { GetDashboardSummaryService } from '@/Modules/Dashboard/Application/Services/GetDashboardSummaryService'
import { MemberDashboardPage } from './Member/MemberDashboardPage'
import { MemberApiKeysPage } from './Member/MemberApiKeysPage'
import { MemberApiKeyCreatePage } from './Member/MemberApiKeyCreatePage'
import { MemberApiKeyRevokeHandler } from './Member/MemberApiKeyRevokeHandler'
import { MemberUsagePage } from './Member/MemberUsagePage'
import { MemberContractsPage } from './Member/MemberContractsPage'
import { MemberSettingsPage } from './Member/MemberSettingsPage'

function loadViteManifest(): ViteManifest | undefined {
  const root = process.cwd()
  const candidates = [
    joinPath(root, 'public/build/.vite/manifest.json'),
    joinPath(root, 'public/build/manifest.json'),
  ]
  for (const p of candidates) {
    const m = ViteTagHelper.loadManifest(p)
    if (m) return m
  }
  return undefined
}

function useBuiltFrontendAssets(): boolean {
  return process.env.NODE_ENV === 'production' || process.env.SERVE_VITE_BUILD === 'true'
}

function createInertiaService(): InertiaService {
  const nodeEnv = process.env.NODE_ENV ?? 'development'
  const devServerUrl = process.env.VITE_DEV_SERVER ?? 'http://localhost:5173'
  const useBuild = useBuiltFrontendAssets()

  let manifest: ViteManifest | undefined
  if (useBuild) {
    manifest = loadViteManifest()
    if (!manifest) {
      console.warn('⚠️ Vite manifest not found — run "bun run build:frontend"')
    }
  }

  const tagEnv = useBuild ? 'production' : nodeEnv
  const viteHelper = new ViteTagHelper(tagEnv, devServerUrl, manifest)
  const viteTags = viteHelper.generateTags(['resources/js/app.tsx', 'resources/css/app.css'])

  const viewDir = joinPath(process.cwd(), 'src/views')
  const templateContent = readFileSync(joinPath(viewDir, 'app.html'), 'utf-8')

  const renderTemplate = (data: Record<string, unknown>): string => {
    let html = templateContent
    html = html.replace(/\{\{\{\s*viteTags\s*\}\}\}/g, data.viteTags as string)
    html = html.replace(/\{\{\{\s*page\s*\}\}\}/g, data.page as string)
    return html
  }

  const version =
    useBuild && manifest
      ? Object.values(manifest)
          .map((e) => e.file)
          .join(',')
          .slice(0, 16)
      : 'dev'

  return new InertiaService(renderTemplate, viteTags, version)
}

function withInertiaPage(handler: (ctx: IHttpContext) => Promise<Response>) {
  const jwtMw = attachJwt()
  return async (c: GravitoContext) => {
    const ctx = fromGravitoContext(c)
    return jwtMw(ctx, async () => {
      injectSharedData(ctx)
      return handler(ctx)
    })
  }
}

export function registerPageRoutes(core: PlanetCore): void {
  const inertia = createInertiaService()

  const summaryService = core.container.make('getDashboardSummaryService') as GetDashboardSummaryService

  const adminDashboard = new AdminDashboardPage(
    inertia,
    core.container.make('listUsersService') as any,
    core.container.make('listOrganizationsService') as any,
    core.container.make('listAdminContractsService') as any,
  )

  const adminUsers = new AdminUsersPage(inertia, core.container.make('listUsersService') as any)
  const adminUserDetail = new AdminUserDetailPage(
    inertia,
    core.container.make('getProfileService') as any,
    core.container.make('authRepository') as any,
    core.container.make('changeUserStatusService') as any,
  )
  const adminOrgs = new AdminOrganizationsPage(
    inertia,
    core.container.make('listOrganizationsService') as any,
  )
  const adminOrgDetail = new AdminOrganizationDetailPage(
    inertia,
    core.container.make('getOrganizationService') as any,
    core.container.make('listMembersService') as any,
  )
  const adminContracts = new AdminContractsPage(
    inertia,
    core.container.make('listAdminContractsService') as any,
  )
  const adminContractCreate = new AdminContractCreatePage(
    inertia,
    core.container.make('createContractService') as any,
  )
  const adminContractDetail = new AdminContractDetailPage(
    inertia,
    core.container.make('getContractDetailService') as any,
    core.container.make('activateContractService') as any,
    core.container.make('terminateContractService') as any,
  )
  const adminModules = new AdminModulesPage(
    inertia,
    core.container.make('listModulesService') as any,
  )
  const adminModuleCreate = new AdminModuleCreatePage(
    inertia,
    core.container.make('registerModuleService') as any,
  )
  const adminApiKeys = new AdminApiKeysPage(
    inertia,
    core.container.make('listApiKeysService') as any,
    core.container.make('listOrganizationsService') as any,
  )
  const adminUsageSync = new AdminUsageSyncPage(inertia)

  const memberDashboard = new MemberDashboardPage(
    inertia,
    summaryService,
    core.container.make('getBalanceService') as any,
  )
  const memberApiKeys = new MemberApiKeysPage(
    inertia,
    core.container.make('listApiKeysService') as any,
  )
  const memberApiKeyCreate = new MemberApiKeyCreatePage(
    inertia,
    core.container.make('createApiKeyService') as any,
  )
  const memberApiKeyRevoke = new MemberApiKeyRevokeHandler(core.container.make('revokeApiKeyService') as any)
  const memberUsage = new MemberUsagePage(
    inertia,
    core.container.make('getUsageChartService') as any,
  )
  const memberContracts = new MemberContractsPage(
    inertia,
    core.container.make('listContractsService') as any,
  )
  const memberSettings = new MemberSettingsPage(
    inertia,
    core.container.make('getProfileService') as any,
    core.container.make('updateProfileService') as any,
  )

  // Admin routes（靜態路徑需先於 :id 動態段註冊）
  core.router.get('/admin/dashboard', withInertiaPage((ctx) => adminDashboard.handle(ctx)))
  core.router.get('/admin/users', withInertiaPage((ctx) => adminUsers.handle(ctx)))
  core.router.get('/admin/users/:id', withInertiaPage((ctx) => adminUserDetail.handle(ctx)))
  core.router.post('/admin/users/:id/status', withInertiaPage((ctx) => adminUserDetail.postStatus(ctx)))
  core.router.get('/admin/organizations', withInertiaPage((ctx) => adminOrgs.handle(ctx)))
  core.router.get('/admin/organizations/:id', withInertiaPage((ctx) => adminOrgDetail.handle(ctx)))
  core.router.get('/admin/contracts', withInertiaPage((ctx) => adminContracts.handle(ctx)))
  core.router.get('/admin/contracts/create', withInertiaPage((ctx) => adminContractCreate.handle(ctx)))
  core.router.post('/admin/contracts', withInertiaPage((ctx) => adminContractCreate.store(ctx)))
  core.router.get('/admin/contracts/:id', withInertiaPage((ctx) => adminContractDetail.handle(ctx)))
  core.router.post('/admin/contracts/:id/action', withInertiaPage((ctx) => adminContractDetail.postAction(ctx)))
  core.router.get('/admin/modules', withInertiaPage((ctx) => adminModules.handle(ctx)))
  core.router.get('/admin/modules/create', withInertiaPage((ctx) => adminModuleCreate.handle(ctx)))
  core.router.post('/admin/modules', withInertiaPage((ctx) => adminModuleCreate.store(ctx)))
  core.router.get('/admin/api-keys', withInertiaPage((ctx) => adminApiKeys.handle(ctx)))
  core.router.get('/admin/usage-sync', withInertiaPage((ctx) => adminUsageSync.handle(ctx)))

  core.router.get('/member/dashboard', withInertiaPage((ctx) => memberDashboard.handle(ctx)))
  core.router.get('/member/api-keys', withInertiaPage((ctx) => memberApiKeys.handle(ctx)))
  core.router.get('/member/api-keys/create', withInertiaPage((ctx) => memberApiKeyCreate.handle(ctx)))
  core.router.post('/member/api-keys', withInertiaPage((ctx) => memberApiKeyCreate.store(ctx)))
  core.router.post('/member/api-keys/:keyId/revoke', withInertiaPage((ctx) => memberApiKeyRevoke.handle(ctx)))
  core.router.get('/member/usage', withInertiaPage((ctx) => memberUsage.handle(ctx)))
  core.router.get('/member/contracts', withInertiaPage((ctx) => memberContracts.handle(ctx)))
  core.router.get('/member/settings', withInertiaPage((ctx) => memberSettings.handle(ctx)))
  core.router.put('/member/settings', withInertiaPage((ctx) => memberSettings.update(ctx)))

  if (useBuiltFrontendAssets()) {
    const staticDir = joinPath(process.cwd(), 'public')
    core.router.get('/build/*', async (c: GravitoContext) => {
      const url = new URL(c.req.url)
      const pathname = decodeURIComponent(url.pathname)
      if (!pathname.startsWith('/build/')) {
        return new Response('Not Found', { status: 404 })
      }
      const relative = pathname.replace(/^\/+/, '')
      const filePath = joinPath(staticDir, relative)
      const normalizedStatic = normalizePath(staticDir)
      const normalizedFilePath = normalizePath(filePath)
      // 檢查歸一化的路徑是否在靜態目錄下
      if (!normalizedFilePath.startsWith(normalizedStatic)) {
        return new Response('Forbidden', { status: 403 })
      }
      try {
        const file = Bun.file(filePath)
        if (await file.exists()) {
          return new Response(file)
        }
      } catch {
        /* ignore */
      }
      return new Response('Not Found', { status: 404 })
    })
  }
}
