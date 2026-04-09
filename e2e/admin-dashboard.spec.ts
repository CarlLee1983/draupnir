import { test, expect } from '@playwright/test'

test.describe('Admin Dashboard', () => {
  test('admin with Bearer token loads Inertia shell', async ({ page, request }) => {
    const email = `admin-e2e-${Date.now()}@test.com`
    const password = 'Test1234!'

    const registerRes = await request.post('/api/auth/register', {
      data: { email, password },
    })
    expect(registerRes.ok()).toBeTruthy()
    const registerJson = (await registerRes.json()) as {
      data?: { id: string }
    }
    const userId = registerJson.data?.id
    expect(userId).toBeTruthy()

    const seedRes = await request.patch('/api/__test__/seed-role', {
      data: { userId, role: 'admin' },
    })
    expect(seedRes.ok()).toBeTruthy()

    const loginRes = await request.post('/api/auth/login', {
      data: { email, password },
    })
    expect(loginRes.ok()).toBeTruthy()
    const loginJson = (await loginRes.json()) as { data?: { accessToken: string } }
    const token = loginJson.data?.accessToken
    expect(token).toBeTruthy()

    await page.setExtraHTTPHeaders({ Authorization: `Bearer ${token}` })
    await page.goto('/admin/dashboard', { waitUntil: 'domcontentloaded' })

    const bootJson = await page.locator('script[type="application/json"][data-page="app"]').textContent()
    expect(bootJson).toContain('Admin/Dashboard/Index')

    await expect(page.getByRole('heading', { name: '系統總覽' })).toBeVisible({ timeout: 15_000 })
  })
})
