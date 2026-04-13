import { chromium } from 'playwright'
import { ReportToken } from '../../Domain/ValueObjects/ReportToken'

export class GeneratePdfService {
  async generate(orgId: string): Promise<Buffer> {
    const browser = await chromium.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })

    try {
      const page = await browser.newPage()

      // Generate a token valid for 30 minutes
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000)
      const token = await ReportToken.generate(orgId, expiresAt)

      const appUrl = process.env.APP_URL || 'http://localhost:3000'
      const url = `${appUrl}/admin/reports/template?token=${token.value}&isAnimationActive=false`

      await page.goto(url, { waitUntil: 'networkidle' })

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px',
        },
      })

      return Buffer.from(pdfBuffer)
    } finally {
      await browser.close()
    }
  }
}
