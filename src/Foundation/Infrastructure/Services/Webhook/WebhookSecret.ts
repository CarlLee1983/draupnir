import { timingSafeEqual } from 'node:crypto'

/**
 * Value object representing a webhook signing secret.
 *
 * @remarks
 * This class provides methods for generating new secrets, signing payloads
 * using HMAC-SHA256, and verifying signatures.
 */
export class WebhookSecret {
  /**
   * Private constructor to enforce use of static factory methods.
   * @param value - The raw secret string
   */
  private constructor(private readonly value: string) {}

  /**
   * Generates a new cryptographically secure webhook secret.
   *
   * @returns A new WebhookSecret instance
   */
  static generate(): WebhookSecret {
    const bytes = new Uint8Array(32)
    crypto.getRandomValues(bytes)
    const raw = Buffer.from(bytes).toString('hex')
    return new WebhookSecret(`whsec_${raw}`)
  }

  /**
   * Creates a WebhookSecret from an existing raw string.
   *
   * @param value - The existing secret string
   * @returns A WebhookSecret instance
   * @throws Error if the secret is empty
   */
  static fromExisting(value: string): WebhookSecret {
    if (!value || value.trim().length === 0) {
      throw new Error('Webhook Secret cannot be empty')
    }
    return new WebhookSecret(value)
  }

  /**
   * Returns the raw secret string.
   *
   * @returns The secret value
   */
  getValue(): string {
    return this.value
  }

  /**
   * Imports the raw secret into a CryptoKey for HMAC signing.
   *
   * @returns A WebCrypto HMAC-SHA256 key
   */
  private async hmacKey(): Promise<CryptoKey> {
    return crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(this.value),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    )
  }

  /**
   * Signs a payload using HMAC-SHA256 and the secret value.
   *
   * @param payload - The data string to sign
   * @returns The hex-encoded signature
   */
  async sign(payload: string): Promise<string> {
    const key = await this.hmacKey()
    const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
    return Buffer.from(signature).toString('hex')
  }

  /**
   * Verifies a signature against a payload using timing-safe comparison.
   *
   * @param payload - The data string that was signed
   * @param signature - The received hex-encoded signature
   * @returns True if the signature is valid, false otherwise
   */
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
