import { scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import type { IPasswordHasher } from '../../Application/Ports/IPasswordHasher'

const scryptAsync = promisify(scrypt)

/**
 * Service for secure password hashing using the scrypt algorithm.
 * Salt: Web Crypto `getRandomValues` (16 bytes, hex). KDF: Node async `scrypt` (same defaults as former `scryptSync`).
 */
export class ScryptPasswordHasher implements IPasswordHasher {
  /**
   * Hashes a plain-text password.
   */
  async hash(plainPassword: string): Promise<string> {
    this.assertStrongPassword(plainPassword)

    const salt = this.randomSaltHex()
    const derivedKey = await this.deriveKey(plainPassword, salt)
    return `${salt}:${derivedKey.toString('hex')}`
  }

  /**
   * Verifies a plain-text password against a stored hash.
   */
  async verify(hashedPassword: string, plainPassword: string): Promise<boolean> {
    const [salt, storedHash] = hashedPassword.split(':')
    if (!salt || !storedHash) {
      return false
    }

    const derivedKey = await this.deriveKey(plainPassword, salt)
    const storedBuffer = Buffer.from(storedHash, 'hex')
    if (derivedKey.length !== storedBuffer.length) {
      return false
    }

    return timingSafeEqual(derivedKey, storedBuffer)
  }

  private randomSaltHex(): string {
    const bytes = new Uint8Array(16)
    globalThis.crypto.getRandomValues(bytes)
    return Buffer.from(bytes).toString('hex')
  }

  private async deriveKey(plainPassword: string, salt: string): Promise<Buffer> {
    return (await scryptAsync(plainPassword, salt, 64)) as Buffer
  }

  /**
   * Asserts that a password meets minimum strength requirements.
   */
  private assertStrongPassword(password: string): void {
    if (!this.isStrong(password)) {
      throw new Error(
        'Password does not meet strength requirements: at least 8 characters with uppercase, lowercase, and numbers',
      )
    }
  }

  /**
   * Checks if a password is considered "strong".
   * Requirements: At least 8 characters, contains uppercase, lowercase, and a digit.
   */
  private isStrong(password: string): boolean {
    const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.{8,}).*$/
    return strongRegex.test(password)
  }
}
