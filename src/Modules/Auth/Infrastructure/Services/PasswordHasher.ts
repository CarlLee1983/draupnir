import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

export class ScryptPasswordHasher {
  async hash(plainPassword: string): Promise<string> {
    this.assertStrongPassword(plainPassword)

    const salt = randomBytes(16).toString('hex')
    const derivedKey = scryptSync(plainPassword, salt, 64)
    return `${salt}:${derivedKey.toString('hex')}`
  }

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

  private assertStrongPassword(password: string): void {
    if (!this.isStrong(password)) {
      throw new Error('密碼不符合強度要求，至少需要 8 個字符，包含大寫、小寫、數字')
    }
  }

  private isStrong(password: string): boolean {
    const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.{8,}).*$/
    return strongRegex.test(password)
  }
}
