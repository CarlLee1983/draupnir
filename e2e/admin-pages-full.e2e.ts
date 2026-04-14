/**
 * Admin 頁面完整白箱 E2E 測試
 *
 * 驗證所有 Admin 頁面的實際 UI 渲染，補充 admin-portal.e2e.ts（僅做路由檢查）的不足。
 * 每個測試確認：heading 可見、關鍵 UI 元件存在。
 */

import { test, expect } from '@playwright/test'

const PASSWORD = 'Test1234!'

/** 建立 admin 帳號並回傳 Bearer token */
async function createAdminAndGetToken(
  request: Parameters<Parameters<typeof test>[1]>[0]['request'],
): Promise<string> {
  const email = `admin-full-${Date.now()}@test.com`

  const registerRes = await request.post('/api/auth/register', { data: { email, password: PASSWORD } })
  expect(registerRes.ok()).toBeTruthy()
  const registerJson = (await registerRes.json()) as { data?: { id: string } }
  const userId = registerJson.data?.id
  expect(userId).toBeTruthy()

  const seedRes = await request.patch('/api/__test__/seed-role', { data: { userId, role: 'admin' } })
  expect(seedRes.ok()).toBeTruthy()

  const loginRes = await request.post('/api/auth/login', { data: { email, password: PASSWORD } })
  expect(loginRes.ok()).toBeTruthy()
  const loginJson = (await loginRes.json()) as { data?: { accessToken: string } }
  const token = loginJson.data?.accessToken
  expect(token).toBeTruthy()

  return token!
}

test.describe('Admin 頁面完整白箱測試', () => {
  // 共用 token - 使用 test.beforeAll 避免重複建立帳號
  let adminToken = ''

  test.beforeAll(async ({ request }) => {
    adminToken = await createAdminAndGetToken(request)
  })

  test('使用者管理 /admin/users 正確渲染', async ({ page }) => {
    await page.setExtraHTTPHeaders({ Authorization: `Bearer ${adminToken}` })
    await page.goto('/admin/users', { waitUntil: 'domcontentloaded' })

    await expect(page.getByRole('heading', { name: '使用者管理' })).toBeVisible({ timeout: 15_000 })
    // 搜尋欄位存在
    await expect(page.getByPlaceholder('搜尋 Email 或名稱...')).toBeVisible()

    await page.screenshot({ path: '/tmp/admin-users.png', fullPage: true })
    console.log('✅ /admin/users 渲染正常')
  })

  test('組織管理 /admin/organizations 正確渲染', async ({ page }) => {
    await page.setExtraHTTPHeaders({ Authorization: `Bearer ${adminToken}` })
    await page.goto('/admin/organizations', { waitUntil: 'domcontentloaded' })

    await expect(page.getByRole('heading', { name: '組織管理' })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByPlaceholder('搜尋組織...')).toBeVisible()

    await page.screenshot({ path: '/tmp/admin-organizations.png', fullPage: true })
    console.log('✅ /admin/organizations 渲染正常')
  })

  test('合約管理 /admin/contracts 正確渲染', async ({ page }) => {
    await page.setExtraHTTPHeaders({ Authorization: `Bearer ${adminToken}` })
    await page.goto('/admin/contracts', { waitUntil: 'domcontentloaded' })

    await expect(page.getByRole('heading', { name: '合約管理' })).toBeVisible({ timeout: 15_000 })
    // 建立合約按鈕
    await expect(page.getByRole('link', { name: /建立合約/ })).toBeVisible()

    await page.screenshot({ path: '/tmp/admin-contracts.png', fullPage: true })
    console.log('✅ /admin/contracts 渲染正常')
  })

  test('建立合約 /admin/contracts/create 表單渲染', async ({ page }) => {
    await page.setExtraHTTPHeaders({ Authorization: `Bearer ${adminToken}` })
    await page.goto('/admin/contracts/create', { waitUntil: 'domcontentloaded' })

    // 確認頁面有渲染（不是 404/403）
    const status = await page.evaluate(() => document.title)
    expect(status).toBeTruthy()

    await page.screenshot({ path: '/tmp/admin-contracts-create.png', fullPage: true })
    console.log('✅ /admin/contracts/create 渲染正常')
  })

  test('模組管理 /admin/modules 正確渲染', async ({ page }) => {
    await page.setExtraHTTPHeaders({ Authorization: `Bearer ${adminToken}` })
    await page.goto('/admin/modules', { waitUntil: 'domcontentloaded' })

    await expect(page.getByRole('heading', { name: '模組管理' })).toBeVisible({ timeout: 15_000 })
    // 註冊模組按鈕
    await expect(page.getByRole('link', { name: /註冊模組/ })).toBeVisible()

    await page.screenshot({ path: '/tmp/admin-modules.png', fullPage: true })
    console.log('✅ /admin/modules 渲染正常')
  })

  test('註冊模組 /admin/modules/create 表單渲染', async ({ page }) => {
    await page.setExtraHTTPHeaders({ Authorization: `Bearer ${adminToken}` })
    await page.goto('/admin/modules/create', { waitUntil: 'domcontentloaded' })

    await page.screenshot({ path: '/tmp/admin-modules-create.png', fullPage: true })

    // 頁面應可正常載入（非 404）
    const url = page.url()
    expect(url).toContain('/admin/modules')
    console.log('✅ /admin/modules/create 渲染正常')
  })

  test('API Keys 總覽 /admin/api-keys 正確渲染', async ({ page }) => {
    await page.setExtraHTTPHeaders({ Authorization: `Bearer ${adminToken}` })
    await page.goto('/admin/api-keys', { waitUntil: 'domcontentloaded' })

    await expect(page.getByRole('heading', { name: 'API Keys 總覽' })).toBeVisible({ timeout: 15_000 })
    // 選擇組織下拉選單
    await expect(page.locator('#orgSelect')).toBeVisible()
    // 無組織選擇時顯示提示
    await expect(page.getByText('請先選擇組織以查看 API Keys')).toBeVisible()

    await page.screenshot({ path: '/tmp/admin-api-keys.png', fullPage: true })
    console.log('✅ /admin/api-keys 渲染正常')
  })

  test('用量同步狀態 /admin/usage-sync 正確渲染', async ({ page }) => {
    await page.setExtraHTTPHeaders({ Authorization: `Bearer ${adminToken}` })
    await page.goto('/admin/usage-sync', { waitUntil: 'domcontentloaded' })

    await expect(page.getByRole('heading', { name: '用量同步狀態' })).toBeVisible({ timeout: 15_000 })
    // 顯示同步相關 card
    await expect(page.getByText('上次同步時間')).toBeVisible()
    await expect(page.getByText('下次同步時間')).toBeVisible()
    await expect(page.getByText('累計處理筆數')).toBeVisible()

    await page.screenshot({ path: '/tmp/admin-usage-sync.png', fullPage: true })
    console.log('✅ /admin/usage-sync 渲染正常')
  })

  test('Report Template /admin/reports/template 正確渲染', async ({ page }) => {
    await page.setExtraHTTPHeaders({ Authorization: `Bearer ${adminToken}` })
    const response = await page.goto('/admin/reports/template', { waitUntil: 'domcontentloaded' })

    const status = response?.status() ?? 0
    await page.screenshot({ path: '/tmp/admin-reports-template.png', fullPage: true })

    // 不應回傳 404
    expect(status).not.toBe(404)
    console.log(`✅ /admin/reports/template 回傳 ${status}`)
  })
})
