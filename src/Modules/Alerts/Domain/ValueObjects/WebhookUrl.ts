import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

export class WebhookUrl {
  private constructor(private readonly rawValue: string) {}

  static async create(raw: string, allowHttp = false): Promise<WebhookUrl> {
    const parsed = new URL(raw)

    if (parsed.protocol !== 'https:' && !(allowHttp && parsed.protocol === 'http:')) {
      throw new Error('Webhook URL must use HTTPS')
    }

    await WebhookUrl.assertSafeHost(parsed.hostname)
    return new WebhookUrl(parsed.toString())
  }

  get value(): string {
    return this.rawValue
  }

  private static async assertSafeHost(hostname: string): Promise<void> {
    const normalizedHost = hostname.toLowerCase()

    if (normalizedHost === 'localhost' || normalizedHost === '0.0.0.0') {
      throw new Error('SSRF: localhost rejected')
    }

    if (isIP(hostname) !== 0) {
      WebhookUrl.assertIpNotPrivate(hostname)
      return
    }

    try {
      const records = await lookup(hostname, { all: true })
      for (const record of records) {
        WebhookUrl.assertIpNotPrivate(record.address)
      }
    } catch {
      throw new Error('SSRF: DNS resolution failed')
    }
  }

  private static assertIpNotPrivate(ip: string): void {
    if (WebhookUrl.isPrivateOrLoopbackIp(ip)) {
      throw new Error('SSRF: private or loopback IP rejected')
    }
  }

  private static isPrivateOrLoopbackIp(ip: string): boolean {
    if (ip.includes(':')) {
      const normalized = ip.toLowerCase()
      if (normalized === '::1' || normalized.startsWith('::1%')) {
        return true
      }

      if (
        normalized.startsWith('fe8') ||
        normalized.startsWith('fe9') ||
        normalized.startsWith('fea') ||
        normalized.startsWith('feb') ||
        normalized.startsWith('fc') ||
        normalized.startsWith('fd')
      ) {
        return true
      }

      return false
    }

    const octets = ip.split('.').map((part) => Number(part))
    if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
      return true
    }

    const [first, second] = octets
    if (first === 10 || first === 127 || first === 0) {
      return true
    }

    if (first === 169 && second === 254) {
      return true
    }

    if (first === 192 && second === 168) {
      return true
    }

    return first === 172 && second >= 16 && second <= 31
  }
}
