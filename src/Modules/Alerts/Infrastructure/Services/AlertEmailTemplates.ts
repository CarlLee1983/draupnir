export interface AlertKeyBreakdownItem {
  readonly label: string
  readonly costUsd: string
  readonly percentage: string
}

export interface AlertEmailTemplateParams {
  readonly orgName: string
  readonly budgetUsd: string
  readonly actualCostUsd: string
  readonly percentage: string
  readonly month: string
  readonly keyBreakdown: readonly AlertKeyBreakdownItem[]
}

function formatKeyRows(keyBreakdown: readonly AlertKeyBreakdownItem[]): string {
  if (keyBreakdown.length === 0) {
    return `
      <tr>
        <td colspan="3" style="padding:16px 14px;color:#6b7280;font-size:14px;border-top:1px solid #fde68a;">
          No billable API key usage was recorded in this period.
        </td>
      </tr>
    `
  }

  return keyBreakdown
    .map(
      (item) => `
      <tr>
        <td style="padding:12px 14px;border-top:1px solid #fde68a;color:#111827;font-size:14px;">${item.label}</td>
        <td style="padding:12px 14px;border-top:1px solid #fde68a;color:#111827;font-size:14px;text-align:right;">$${item.costUsd}</td>
        <td style="padding:12px 14px;border-top:1px solid #fde68a;color:#111827;font-size:14px;text-align:right;">${item.percentage}%</td>
      </tr>
    `,
    )
    .join('')
}

function buildTemplate(params: AlertEmailTemplateParams, severity: 'warning' | 'critical'): string {
  const accent = severity === 'critical' ? '#dc2626' : '#f59e0b'
  const accentSoft = severity === 'critical' ? '#fef2f2' : '#fffbeb'
  const title = severity === 'critical' ? 'Critical (100%)' : 'Warning (80%)'
  const heading =
    severity === 'critical' ? 'Critical cost threshold reached' : 'Warning threshold reached'

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0;padding:0;background:${accentSoft};font-family:Arial,Helvetica,sans-serif;">
      <tr>
        <td style="padding:24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid ${accent};border-radius:18px;overflow:hidden;">
            <tr>
              <td style="padding:28px 30px 16px;border-bottom:1px solid #f3f4f6;">
                <div style="display:block;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${accent};margin-bottom:8px;">${title}</div>
                <h1 style="margin:0;font-size:28px;line-height:1.2;color:#111827;">${heading}</h1>
                <p style="margin:12px 0 0;font-size:15px;line-height:1.7;color:#374151;">
                  Organization <strong>${params.orgName}</strong> exceeded the configured budget threshold for <strong>${params.month}</strong>.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 30px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#fffaf0;border:1px solid #fde68a;border-radius:12px;overflow:hidden;">
                  <tr>
                    <td style="padding:12px 14px;color:#6b7280;font-size:13px;border-bottom:1px solid #fde68a;">Budget</td>
                    <td style="padding:12px 14px;color:#111827;font-size:14px;border-bottom:1px solid #fde68a;text-align:right;">$${params.budgetUsd}</td>
                  </tr>
                  <tr>
                    <td style="padding:12px 14px;color:#6b7280;font-size:13px;border-bottom:1px solid #fde68a;">Actual cost</td>
                    <td style="padding:12px 14px;color:#111827;font-size:14px;border-bottom:1px solid #fde68a;text-align:right;">$${params.actualCostUsd}</td>
                  </tr>
                  <tr>
                    <td style="padding:12px 14px;color:#6b7280;font-size:13px;border-bottom:1px solid #fde68a;">Budget usage</td>
                    <td style="padding:12px 14px;color:#111827;font-size:14px;border-bottom:1px solid #fde68a;text-align:right;">${params.percentage}%</td>
                  </tr>
                  <tr>
                    <td style="padding:12px 14px;color:#6b7280;font-size:13px;">Severity</td>
                    <td style="padding:12px 14px;color:${accent};font-size:14px;font-weight:700;text-align:right;">${title}</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 30px 26px;">
                <h2 style="margin:0 0 12px;font-size:18px;color:#111827;">Per-key cost breakdown</h2>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #fde68a;border-radius:12px;overflow:hidden;">
                  <tr>
                    <th style="padding:12px 14px;background:${accentSoft};color:#92400e;font-size:13px;text-align:left;border-bottom:1px solid #fde68a;">API Key</th>
                    <th style="padding:12px 14px;background:${accentSoft};color:#92400e;font-size:13px;text-align:right;border-bottom:1px solid #fde68a;">Cost (USD)</th>
                    <th style="padding:12px 14px;background:${accentSoft};color:#92400e;font-size:13px;text-align:right;border-bottom:1px solid #fde68a;">% of Budget</th>
                  </tr>
                  ${formatKeyRows(params.keyBreakdown)}
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `
}

export function warningAlertTemplate(params: AlertEmailTemplateParams): string {
  return buildTemplate(params, 'warning')
}

export function criticalAlertTemplate(params: AlertEmailTemplateParams): string {
  return buildTemplate(params, 'critical')
}
