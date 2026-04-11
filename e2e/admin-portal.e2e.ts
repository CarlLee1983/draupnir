import { test, expect } from '@playwright/test'

test.describe('Admin Portal', () => {
  test('Admin Dashboard 未登入時回傳重導（不跟隨 redirect）', async ({ request }) => {
    const res = await request.get('/admin/dashboard', { maxRedirects: 0 })
    expect([302, 303]).toContain(res.status())
  })

  test('非 admin 存取 Admin 頁面回傳 403', async ({ page, request }) => {
    const email = `user-${Date.now()}@test.com`
    await request.post('/api/auth/register', {
      data: { email, password: 'Test1234!' },
    })
    const loginRes = await request.post('/api/auth/login', {
      data: { email, password: 'Test1234!' },
    })
    const loginJson = (await loginRes.json()) as { data?: { accessToken: string } }
    const token = loginJson.data?.accessToken
    expect(token).toBeTruthy()

    await page.setExtraHTTPHeaders({
      Authorization: `Bearer ${token}`,
    })

    const response = await page.goto('/admin/users')
    expect(response?.status()).toBe(403)
  })

  test('各 Admin 頁面路由存在（不驗證渲染）', async ({ request }) => {
    const routes = [
      '/admin/dashboard',
      '/admin/users',
      '/admin/organizations',
      '/admin/contracts',
      '/admin/contracts/create',
      '/admin/modules',
      '/admin/modules/create',
      '/admin/api-keys',
      '/admin/usage-sync',
    ]

    for (const route of routes) {
      const res = await request.get(route, { maxRedirects: 0 })
      expect(res.status()).not.toBe(404)
    }
  })
})
