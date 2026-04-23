import { describe, expect, mock, test } from 'bun:test'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { HomePage } from '../../Auth/Pages/HomePage'

function makeCtx(auth: { userId: string; email: string; role: string } | null): IHttpContext {
  const store = new Map<string, unknown>()
  if (auth) {
    store.set('auth', {
      userId: auth.userId,
      email: auth.email,
      role: auth.role,
      permissions: [],
      tokenType: 'access',
    })
  }
  return {
    get: <T>(k: string) => store.get(k) as T | undefined,
    set: () => {},
    redirect: mock((url: string) => Response.redirect(url, 302)),
  } as unknown as IHttpContext
}

describe('HomePage', () => {
  test('guest redirects to /login', async () => {
    const page = new HomePage()
    const ctx = makeCtx(null)
    await page.handle(ctx)
    expect(ctx.redirect).toHaveBeenCalledWith('/login')
  })

  test('admin redirects to /admin/dashboard', async () => {
    const page = new HomePage()
    const ctx = makeCtx({ userId: 'a', email: 'a@x', role: 'admin' })
    await page.handle(ctx)
    expect(ctx.redirect).toHaveBeenCalledWith('/admin/dashboard')
  })

  test('manager redirects to /manager/dashboard', async () => {
    const page = new HomePage()
    const ctx = makeCtx({ userId: 'm', email: 'm@x', role: 'manager' })
    await page.handle(ctx)
    expect(ctx.redirect).toHaveBeenCalledWith('/manager/dashboard')
  })

  test('member redirects to /member/api-keys', async () => {
    const page = new HomePage()
    const ctx = makeCtx({ userId: 'u', email: 'u@x', role: 'member' })
    await page.handle(ctx)
    expect(ctx.redirect).toHaveBeenCalledWith('/member/api-keys')
  })
})
