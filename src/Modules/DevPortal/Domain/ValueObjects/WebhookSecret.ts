import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

export class WebhookSecret {
  private constructor(private readonly value: string) {}

  static generate(): WebhookSecret {
    const raw = randomBytes(32).toString('hex')
    return new WebhookSecret(`whsec_${raw}`)
  }

  static fromExisting(value: string): WebhookSecret {
    if (!value || value.trim().length === 0) {
      throw new Error('Webhook Secret 不能為空')
    }
    return new WebhookSecret(value)
  }

  getValue(): string {
    return this.value
  }

  sign(payload: string): string {
    return createHmac('sha256', this.value).update(payload).digest('hex')
  }

  verify(payload: string, signature: string): boolean {
    const expected = this.sign(payload)
    if (expected.length !== signature.length) return false
    try {
      return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'))
    } catch {
      return false
    }
  }
}
