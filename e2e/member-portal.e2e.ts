import { test, expect } from '@playwright/test'

test.describe('Member Portal', { tag: '@smoke' }, () => {
  test('member with Bearer token loads dashboard', async ({ page, request }) => {
    const email = `member-e2e-${Date.now()}@test.com`
    const password = 'Test1234!'

    const registerRes = await request.post('/api/auth/register', {
      data: { email, password },
    })
    expect(registerRes.ok()).toBeTruthy()

    const loginRes = await request.post('/api/auth/login', {
      data: { email, password },
    })
    expect(loginRes.ok()).toBeTruthy()
    const loginJson = (await loginRes.json()) as { data?: { accessToken: string } }
    const token = loginJson.data?.accessToken
    expect(token).toBeTruthy()

    await page.setExtraHTTPHeaders({ Authorization: `Bearer ${token}` })
    await page.goto('/member/dashboard', { waitUntil: 'domcontentloaded' })

    const bootJson = await page.locator('script[type="application/json"][data-page="app"]').textContent()
    expect(bootJson).toContain('Member/Dashboard/Index')

    await expect(page.getByRole('heading', { name: '總覽' })).toBeVisible({ timeout: 15_000 })
  })

  test('API Keys list page loads', async ({ page, request }) => {
    const email = `member-keys-${Date.now()}@test.com`
    const password = 'Test1234!'

    await request.post('/api/auth/register', { data: { email, password } })
    const loginRes = await request.post('/api/auth/login', { data: { email, password } })
    const loginJson = (await loginRes.json()) as { data?: { accessToken: string } }
    const token = loginJson.data?.accessToken
    expect(token).toBeTruthy()

    await page.setExtraHTTPHeaders({ Authorization: `Bearer ${token}` })
    await page.goto('/member/api-keys', { waitUntil: 'domcontentloaded' })

    await expect(page.getByRole('heading', { name: 'API Keys' })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('link', { name: /建立 Key/ })).toBeVisible()
  })

  test('API Key create page shows form', async ({ page, request }) => {
    const email = `member-create-${Date.now()}@test.com`
    const password = 'Test1234!'

    await request.post('/api/auth/register', { data: { email, password } })
    const loginRes = await request.post('/api/auth/login', { data: { email, password } })
    const loginJson = (await loginRes.json()) as { data?: { accessToken: string } }
    const token = loginJson.data?.accessToken
    expect(token).toBeTruthy()

    await page.setExtraHTTPHeaders({ Authorization: `Bearer ${token}` })
    await page.goto('/member/api-keys/create', { waitUntil: 'domcontentloaded' })

    await expect(page.locator('input#label')).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('input#rpm')).toBeVisible()
    await expect(page.locator('input#tpm')).toBeVisible()
  })

  test('Usage page loads', async ({ page, request }) => {
    const email = `member-usage-${Date.now()}@test.com`
    const password = 'Test1234!'

    await request.post('/api/auth/register', { data: { email, password } })
    const loginRes = await request.post('/api/auth/login', { data: { email, password } })
    const loginJson = (await loginRes.json()) as { data?: { accessToken: string } }
    const token = loginJson.data?.accessToken
    expect(token).toBeTruthy()

    await page.setExtraHTTPHeaders({ Authorization: `Bearer ${token}` })
    await page.goto('/member/usage', { waitUntil: 'domcontentloaded' })

    await expect(page.getByRole('heading', { name: '用量分析' })).toBeVisible({ timeout: 15_000 })
  })

  test('Contracts page loads', async ({ page, request }) => {
    const email = `member-contracts-${Date.now()}@test.com`
    const password = 'Test1234!'

    await request.post('/api/auth/register', { data: { email, password } })
    const loginRes = await request.post('/api/auth/login', { data: { email, password } })
    const loginJson = (await loginRes.json()) as { data?: { accessToken: string } }
    const token = loginJson.data?.accessToken
    expect(token).toBeTruthy()

    await page.setExtraHTTPHeaders({ Authorization: `Bearer ${token}` })
    await page.goto('/member/contracts', { waitUntil: 'domcontentloaded' })

    await expect(page.getByRole('heading', { name: '合約' })).toBeVisible({ timeout: 15_000 })
  })

  test('Settings page shows profile form', async ({ page, request }) => {
    const email = `member-settings-${Date.now()}@test.com`
    const password = 'Test1234!'

    await request.post('/api/auth/register', { data: { email, password } })
    const loginRes = await request.post('/api/auth/login', { data: { email, password } })
    const loginJson = (await loginRes.json()) as { data?: { accessToken: string } }
    const token = loginJson.data?.accessToken
    expect(token).toBeTruthy()

    await page.setExtraHTTPHeaders({ Authorization: `Bearer ${token}` })
    await page.goto('/member/settings', { waitUntil: 'domcontentloaded' })

    await expect(page.getByRole('heading', { name: '個人設定' })).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('input#email')).toBeDisabled()
    await expect(page.locator('input#displayName')).toBeEnabled()
  })
})
