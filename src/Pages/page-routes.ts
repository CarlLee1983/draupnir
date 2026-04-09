import type { PlanetCore } from '@gravito/core'
import type { GravitoContext } from '@gravito/core'
import { resolve } from 'node:path'
import { readFileSync } from 'node:fs'
import { fromGravitoContext, type IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { attachJwt } from '@/Modules/Auth/Presentation/Middleware/RoleMiddleware'
import { InertiaService } from './InertiaService'
import { ViteTagHelper, type ViteManifest } from './ViteTagHelper'
import { injectSharedData } from './SharedDataMiddleware'
import { AdminDashboardPage } from './Admin/AdminDashboardPage'
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
    resolve(root, 'public/build/.vite/manifest.json'),
    resolve(root, 'public/build/manifest.json'),
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

  const viewDir = resolve(process.cwd(), 'src/views')
  const templateContent = readFileSync(resolve(viewDir, 'app.html'), 'utf-8')

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
  const adminDashboard = new AdminDashboardPage(inertia, summaryService)

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

  core.router.get('/admin/dashboard', withInertiaPage((ctx) => adminDashboard.handle(ctx)))

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
    const staticDir = resolve(process.cwd(), 'public')
    core.router.get('/build/*', async (c: GravitoContext) => {
      const url = new URL(c.req.url)
      const pathname = decodeURIComponent(url.pathname)
      if (!pathname.startsWith('/build/')) {
        return new Response('Not Found', { status: 404 })
      }
      const relative = pathname.replace(/^\/+/, '')
      const filePath = resolve(staticDir, relative)
      const normalized = resolve(staticDir)
      if (!filePath.startsWith(normalized)) {
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
