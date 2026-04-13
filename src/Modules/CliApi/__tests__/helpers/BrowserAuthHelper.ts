import { type Browser, chromium, type Page } from '@playwright/test'

/**
 * Automates browser interactions for Device Flow authorization.
 *
 * Simulates a user visiting the verification URI and authorizing a device code.
 */
export class BrowserAuthHelper {
  private browser?: Browser
  private page?: Page

  /**
   * Launch browser instance
   */
  async launch(headless: boolean = true): Promise<void> {
    try {
      this.browser = await chromium.launch({ headless })
      this.page = await this.browser.newPage()
    } catch (error) {
      // 在沒有 X11 或其他顯示伺服器的環境（如 CI/CD）中，瀏覽器啟動會失敗
      console.warn(
        'Failed to launch browser, skipping browser-based tests:',
        error instanceof Error ? error.message : String(error),
      )
    }
  }

  /**
   * Ensure the browser has a live, open page (recreates if closed by a prior test failure)
   */
  private async ensurePage(): Promise<Page> {
    if (!this.browser) {
      throw new Error('Browser not launched — call launch() first')
    }
    if (!this.page || this.page.isClosed()) {
      this.page = await this.browser.newPage()
    }
    return this.page
  }

  /**
   * Navigate to verification URI and authorize device with user code
   */
  async authorizeDevice(verificationUri: string, userCode: string): Promise<void> {
    if (!this.browser || !this.page) {
      throw new Error('Browser not available - ensure launch() was called successfully')
    }

    const page = await this.ensurePage()

    await page.goto(verificationUri, { waitUntil: 'networkidle' })

    const userCodeInput = page.locator(
      'input[name="userCode"], input[placeholder*="code"], input[placeholder*="Code"]',
    )

    await userCodeInput.fill(userCode)

    const submitButton = page.locator(
      'button[type="submit"], button:has-text("Authorize"), button:has-text("authorize")',
    )

    await submitButton.click()

    await page.waitForLoadState('networkidle')
  }

  /**
   * Get current page URL (for assertions)
   */
  getCurrentUrl(): string | null {
    return this.page?.url() || null
  }

  /**
   * Get page content (for assertions)
   */
  async getPageContent(): Promise<string> {
    const page = await this.ensurePage()
    return page.content()
  }

  /**
   * Close browser
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close()
    }
  }
}
