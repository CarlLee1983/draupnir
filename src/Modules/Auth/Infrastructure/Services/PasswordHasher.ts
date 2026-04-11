import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import type { IPasswordHasher } from '../../Application/Ports/IPasswordHasher'

/**
 * Service for secure password hashing using the scrypt algorithm.
 */
export class ScryptPasswordHasher implements IPasswordHasher {
  /**
   * Hashes a plain-text password.
   */
  async hash(plainPassword: string): Promise<string> {
    this.assertStrongPassword(plainPassword)

    const salt = randomBytes(16).toString('hex')
    const derivedKey = scryptSync(plainPassword, salt, 64)
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

    const derivedKey = scryptSync(plainPassword, salt, 64)
    const storedBuffer = Buffer.from(storedHash, 'hex')
    if (derivedKey.length !== storedBuffer.length) {
      return false
    }

    return timingSafeEqual(derivedKey, storedBuffer)
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
