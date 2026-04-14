/**
 * Auth 白箱 E2E 測試
 *
 * 透過網頁 UI 操作驗證：
 * - 使用者從 /register 頁面完成表單填寫並成功註冊
 * - 使用者從 /login 頁面完成表單填寫並成功登入
 */

import { test, expect } from '@playwright/test'

const BASE_EMAIL = () => `web-e2e-${Date.now()}@test.com`
const PASSWORD = 'Test1234!'

test.describe('Auth 網頁 UI 白箱測試', () => {
  test('從 /register 頁面成功註冊新帳號', async ({ page }) => {
    const email = BASE_EMAIL()

    // 前往註冊頁面
    await page.goto('/register', { waitUntil: 'networkidle' })

    // 確認頁面標題
    await expect(page.locator('h1, [class*="title"]').first()).toBeVisible({ timeout: 10_000 })

    // 截圖確認頁面狀態
    await page.screenshot({ path: '/tmp/register-before.png', fullPage: true })

    // 填寫表單
    await page.fill('#email', email)
    await page.fill('#password', PASSWORD)
    await page.fill('#passwordConfirmation', PASSWORD)
    await page.check('#agreedToTerms')

    // 截圖確認填寫狀態
    await page.screenshot({ path: '/tmp/register-filled.png', fullPage: true })

    // 提交表單
    await page.click('button[type="submit"]')

    // 等待導向（成功後應轉向 dashboard 或 login）
    await page.waitForURL((url) => !url.pathname.includes('/register'), { timeout: 15_000 })

    // 截圖確認跳轉結果
    await page.screenshot({ path: '/tmp/register-after.png', fullPage: true })

    const currentUrl = page.url()
    expect(currentUrl).not.toContain('/register')
    console.log(`✅ 註冊成功，跳轉至：${currentUrl}`)
  })

  test('從 /login 頁面成功登入', async ({ page, request }) => {
    const email = BASE_EMAIL()

    // 先透過 API 建立帳號，確保帳號存在
    const registerRes = await request.post('/api/auth/register', {
      data: { email, password: PASSWORD },
    })
    expect(registerRes.ok()).toBeTruthy()

    // 前往登入頁面
    await page.goto('/login', { waitUntil: 'networkidle' })

    // 截圖確認頁面狀態
    await page.screenshot({ path: '/tmp/login-before.png', fullPage: true })

    // 填寫表單
    await page.fill('#email', email)
    await page.fill('#password', PASSWORD)

    // 截圖確認填寫狀態
    await page.screenshot({ path: '/tmp/login-filled.png', fullPage: true })

    // 提交表單
    await page.click('button[type="submit"]')

    // 等待導向（成功後應轉向 dashboard）
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15_000 })

    // 截圖確認跳轉結果
    await page.screenshot({ path: '/tmp/login-after.png', fullPage: true })

    const currentUrl = page.url()
    expect(currentUrl).not.toContain('/login')
    console.log(`✅ 登入成功，跳轉至：${currentUrl}`)
  })

  test('完整流程：網頁註冊 → 網頁登入', async ({ page }) => {
    const email = BASE_EMAIL()

    // === 步驟一：從 /register 頁面註冊 ===
    await page.goto('/register', { waitUntil: 'networkidle' })
    await page.fill('#email', email)
    await page.fill('#password', PASSWORD)
    await page.fill('#passwordConfirmation', PASSWORD)
    await page.check('#agreedToTerms')
    await page.click('button[type="submit"]')

    // 等待離開註冊頁面
    await page.waitForURL((url) => !url.pathname.includes('/register'), { timeout: 15_000 })
    console.log(`步驟一完成，目前頁面：${page.url()}`)

    // === 步驟二：導向 /login 並用相同帳號登入 ===
    await page.goto('/login', { waitUntil: 'networkidle' })
    await page.fill('#email', email)
    await page.fill('#password', PASSWORD)
    await page.click('button[type="submit"]')

    // 等待登入成功後跳轉
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15_000 })

    await page.screenshot({ path: '/tmp/full-flow-after-login.png', fullPage: true })

    const currentUrl = page.url()
    expect(currentUrl).not.toContain('/login')
    console.log(`✅ 完整流程成功，最終頁面：${currentUrl}`)
  })
})
