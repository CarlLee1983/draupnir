import type { IKeyHashingService } from '../../Domain/Ports/IKeyHashingService'

/**
 * SHA-256 key hashing using Web Crypto API.
 */
export class KeyHashingService implements IKeyHashingService {
  async hash(rawKey: string): Promise<string> {
    const encoded = new TextEncoder().encode(rawKey)
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoded)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  }
}
