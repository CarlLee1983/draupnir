import { chromium, type Browser, type Page } from '@playwright/test'

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
    this.browser = await chromium.launch({ headless })
    this.page = await this.browser.newPage()
  }

  /**
   * Navigate to verification URI and authorize device with user code
   */
  async authorizeDevice(verificationUri: string, userCode: string): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not launched — call launch() first')
    }

    await this.page.goto(verificationUri, { waitUntil: 'networkidle' })

    const userCodeInput = this.page.locator(
      'input[name="userCode"], input[placeholder*="code"], input[placeholder*="Code"]',
    )

    await userCodeInput.fill(userCode)

    const submitButton = this.page.locator(
      'button[type="submit"], button:has-text("Authorize"), button:has-text("authorize")',
    )

    await submitButton.click()

    await this.page.waitForLoadState('networkidle')
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
    if (!this.page) {
      throw new Error('Browser not launched')
    }
    return this.page.content()
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
