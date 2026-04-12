export class ReportToken {
  constructor(public readonly value: string) {}

  static async generate(orgId: string, expiresAt: Date): Promise<ReportToken> {
    const secret = process.env.REPORT_SIGNING_SECRET
    if (!secret) {
      throw new Error('REPORT_SIGNING_SECRET is not set')
    }

    const payload = JSON.stringify({ orgId, expiresAt: expiresAt.getTime() })
    const base64Payload = Buffer.from(payload).toString('base64url')
    
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    
    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      key,
      new TextEncoder().encode(base64Payload)
    )
    
    const signature = Buffer.from(signatureBuffer).toString('base64url')

    return new ReportToken(`${base64Payload}.${signature}`)
  }

  static async verify(token: string): Promise<{ orgId: string; expiresAt: number } | null> {
    try {
      const secret = process.env.REPORT_SIGNING_SECRET
      if (!secret) {
        return null
      }

      const parts = token.split('.')
      if (parts.length !== 2) {
        return null
      }

      const [base64Payload, signature] = parts
      
      const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['verify']
      )
      
      const isValid = await crypto.subtle.verify(
        'HMAC',
        key,
        Buffer.from(signature, 'base64url'),
        new TextEncoder().encode(base64Payload)
      )

      if (!isValid) {
        return null
      }

      const payload = JSON.parse(Buffer.from(base64Payload, 'base64url').toString())
      if (Date.now() > payload.expiresAt) {
        return null
      }

      return payload
    } catch {
      return null
    }
  }
}
