import { describe, expect, mock, test } from 'bun:test'
import type { AdjustContractQuotaService } from '@/Modules/Contract/Application/Services/AdjustContractQuotaService'
import { loadMessages } from '@/Shared/Infrastructure/I18n'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { AdminContractDetailPage } from '../../Admin/Pages/AdminContractDetailPage'
import type { InertiaService } from '../../Http/Inertia/InertiaRequestHandler'

// Helper: 建立 store
function makeStore(auth = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' }) {
  const store = new Map<string, unknown>()
  store.set('auth', auth)
  store.set('inertia:shared', {
    locale: 'en',
    messages: loadMessages('en'),
    auth: { user: auth },
    currentOrgId: null,
    flash: {},
  })
  return store
}

// Helper: 建立 ctx
function makeCtx(store: Map<string, unknown>, body: unknown = {}, paramId?: string): IHttpContext {
  return {
    getBodyText: async () => '',
    getJsonBody: async <T>() => body as T,
    getBody: async <T>() => ({}) as T,
    getHeader: () => undefined,
    getParam: (name: string) => (name === 'id' ? paramId : undefined),
    getPathname: () => '/admin/contracts/contract-1/quota',
    getQuery: () => undefined,
    params: {},
    query: {},
    headers: {},
    json: (data: unknown, status?: number) => Response.json(data, { status: status ?? 200 }),
    text: (content: string, status?: number) => new Response(content, { status: status ?? 200 }),
    redirect: (url: string, status?: number) => Response.redirect(url, status ?? 302),
    get: <T>(key: string) => store.get(key) as T | undefined,
    set: (key: string, value: unknown) => {
      store.set(key, value)
    },
    getCookie: () => undefined,
    setCookie: () => {},
    getMethod: () => 'POST',
  } as unknown as IHttpContext
}

function makeMockInertia() {
  return {
    render: (_ctx: IHttpContext, component: string, props: Record<string, unknown>) =>
      new Response(JSON.stringify({ component, props }), {
        headers: { 'Content-Type': 'application/json' },
      }),
  } as unknown as InertiaService
}

function makeMockAdjustQuotaService() {
  return {
    execute: mock(async () => ({
      success: true,
      message: 'Contract quota adjusted',
      data: {
        contractId: 'contract-1',
        oldCap: 100,
        newCap: 200,
        changes: [],
        hardBlockedKeyIds: [],
      },
    })),
  } as unknown as AdjustContractQuotaService
}

describe('AdminContractDetailPage.postQuota', () => {
  test('QUOTA-PAGE-01: 呼叫 adjustQuotaService.execute() 並重導向至 /admin/contracts/contract-1', async () => {
    const store = makeStore()
    const ctx = makeCtx(store, { newCap: 200 }, 'contract-1')
    const inertia = makeMockInertia()
    const adjustQuotaService = makeMockAdjustQuotaService()
    const page = new AdminContractDetailPage(
      inertia,
      { execute: mock(async () => ({ success: true, data: null })) } as any,
      { execute: mock(async () => {}) } as any,
      { execute: mock(async () => {}) } as any,
      adjustQuotaService,
    )

    const response = await page.postQuota(ctx)

    expect(adjustQuotaService.execute).toHaveBeenCalledWith({
      contractId: 'contract-1',
      newCap: 200,
      callerRole: 'admin',
    })
    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toContain('/admin/contracts/contract-1')
  })

  test('QUOTA-PAGE-02: 缺少 id 時重導向至 /admin/contracts', async () => {
    const store = makeStore()
    const ctx = makeCtx(store, { newCap: 200 }, undefined)
    const inertia = makeMockInertia()
    const adjustQuotaService = makeMockAdjustQuotaService()
    const page = new AdminContractDetailPage(
      inertia,
      { execute: mock(async () => ({ success: true, data: null })) } as any,
      { execute: mock(async () => {}) } as any,
      { execute: mock(async () => {}) } as any,
      adjustQuotaService,
    )

    const response = await page.postQuota(ctx)

    expect(adjustQuotaService.execute).not.toHaveBeenCalled()
    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toContain('/admin/contracts')
  })

  test('QUOTA-PAGE-03: newCap 不是 number 時重導向至 /admin/contracts/contract-1，且不呼叫 adjustQuotaService', async () => {
    const store = makeStore()
    const ctx = makeCtx(store, { newCap: 'not-a-number' }, 'contract-1')
    const inertia = makeMockInertia()
    const adjustQuotaService = makeMockAdjustQuotaService()
    const page = new AdminContractDetailPage(
      inertia,
      { execute: mock(async () => ({ success: true, data: null })) } as any,
      { execute: mock(async () => {}) } as any,
      { execute: mock(async () => {}) } as any,
      adjustQuotaService,
    )

    const response = await page.postQuota(ctx)

    expect(adjustQuotaService.execute).not.toHaveBeenCalled()
    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toContain('/admin/contracts/contract-1')
  })
})
