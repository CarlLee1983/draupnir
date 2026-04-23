import { timingSafeEqual } from 'node:crypto'

export class WebhookSecret {
  private constructor(private readonly value: string) {}

  static generate(): WebhookSecret {
    const bytes = new Uint8Array(32)
    crypto.getRandomValues(bytes)
    const raw = Buffer.from(bytes).toString('hex')
    return new WebhookSecret(`whsec_${raw}`)
  }

  static fromExisting(value: string): WebhookSecret {
    if (!value || value.trim().length === 0) {
      throw new Error('Webhook Secret cannot be empty')
    }
    return new WebhookSecret(value)
  }

  getValue(): string {
    return this.value
  }

  private async hmacKey(): Promise<CryptoKey> {
    return crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(this.value),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    )
  }

  async sign(payload: string): Promise<string> {
    const key = await this.hmacKey()
    const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
    return Buffer.from(signature).toString('hex')
  }

  async verify(payload: string, signature: string): Promise<boolean> {
    const expected = await this.sign(payload)
    if (expected.length !== signature.length) return false
    try {
      return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'))
    } catch {
      return false
    }
  }
}
