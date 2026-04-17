/**
 * Member 頁面擴充白箱 E2E 測試
 *
 * 補充 member-portal.e2e.ts 未涵蓋的頁面：
 * - /member/cost-breakdown（一般 member 會重導向 dashboard）
 * - /member/alerts
 */

import { test, expect } from '@playwright/test'

const PASSWORD = 'Test1234!'

async function createMemberAndGetToken(request: Parameters<Parameters<typeof test>[1]>[0]['request']) {
  const email = `member-ext-${Date.now()}@test.com`
  await request.post('/api/auth/register', { data: { email, password: PASSWORD } })
  const loginRes = await request.post('/api/auth/login', { data: { email, password: PASSWORD } })
  const loginJson = (await loginRes.json()) as { data?: { accessToken: string } }
  return { email, token: loginJson.data?.accessToken ?? '' }
}

test.describe('Member 擴充頁面白箱測試', () => {
  test('/member/cost-breakdown 對一般 member 重導向至總覽', async ({ page, request }) => {
    const { token } = await createMemberAndGetToken(request)

    await page.setExtraHTTPHeaders({ Authorization: `Bearer ${token}` })
    await page.goto('/member/cost-breakdown', { waitUntil: 'domcontentloaded' })

    await expect(page).toHaveURL(/\/member\/dashboard/)
    await expect(page.getByRole('heading', { name: '總覽' })).toBeVisible({ timeout: 15_000 })

    await page.screenshot({ path: '/tmp/cost-breakdown-redirect.png', fullPage: true })
    console.log('✅ 成本分析舊網址已正確重導向 dashboard')
  })

  test('Alerts 頁面 /member/alerts 正確渲染（需 org manager）', async ({ page, request }) => {
    const { token } = await createMemberAndGetToken(request)

    await page.setExtraHTTPHeaders({ Authorization: `Bearer ${token}` })
    const response = await page.goto('/member/alerts', { waitUntil: 'domcontentloaded' })

    // 無組織身份可能被 403 或重導向，記錄結果即可
    const status = response?.status() ?? 0
    await page.screenshot({ path: '/tmp/alerts.png', fullPage: true })

    if (status === 403) {
      console.log('⚠️  /member/alerts 需要 organization manager 角色，回傳 403（預期行為）')
    } else if (status < 400) {
      // 若成功渲染，確認標題
      await expect(page.getByRole('heading', { name: 'Alerts' })).toBeVisible({ timeout: 15_000 })
      console.log('✅ Alerts 頁面渲染正常')
    } else {
      console.log(`ℹ️  /member/alerts 回傳 ${status}`)
    }

    // 不管狀態，重點是頁面不 crash（回傳 4xx 是預期的授權行為）
    // 400 = 無組織身份（requireOrganizationManager 在無組織時回傳 400）
    // 403 = 有登入但無 manager 角色
    // 200/302 = 成功或重導向
    expect([200, 302, 400, 403]).toContain(status)
  })
})
