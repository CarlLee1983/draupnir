/**
 * Password 值物件
 *
 * 責任：
 * - 密碼強度驗證
 * - 密碼加密（使用 Node.js crypto 模組，相容 Bun 和 Node.js）
 * - 密碼驗證
 */

import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

export class Password {
  private readonly hashedPassword: string

  private constructor(hashedPassword: string) {
    this.hashedPassword = hashedPassword
  }

  /**
   * 建立密碼值物件（明文密碼會被加密）
   * @param plainPassword 明文密碼
   * @throws Error 如果密碼不符合強度要求
   */
  static async create(plainPassword: string): Promise<Password> {
    if (!Password.isStrong(plainPassword)) {
      throw new Error(
        '密碼不符合強度要求，至少需要 8 個字符，包含大寫、小寫、數字'
      )
    }
    const hashed = await Password.hash(plainPassword)
    return new Password(hashed)
  }

  /**
   * 從已加密的密碼重構值物件
   * @param hashedPassword 已加密的密碼
   */
  static fromHashed(hashedPassword: string): Password {
    return new Password(hashedPassword)
  }

  /**
   * 驗證密碼強度（最少 8 個字符，包含大寫、小寫、數字）
   */
  private static isStrong(password: string): boolean {
    const strongRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.{8,}).*$/
    return strongRegex.test(password)
  }

  /**
   * 使用 Node.js crypto 模組進行密碼加密（scrypt 演算法）
   */
  private static async hash(plainPassword: string): Promise<string> {
    const salt = randomBytes(16).toString('hex')
    const derivedKey = scryptSync(plainPassword, salt, 64)
    return `${salt}:${derivedKey.toString('hex')}`
  }

  /**
   * 驗證明文密碼是否與加密密碼匹配
   */
  async matches(plainPassword: string): Promise<boolean> {
    const [salt, storedHash] = this.hashedPassword.split(':')
    if (!salt || !storedHash) {
      return false
    }
    const derivedKey = scryptSync(plainPassword, salt, 64)
    const storedBuffer = Buffer.from(storedHash, 'hex')
    return timingSafeEqual(derivedKey, storedBuffer)
  }

  /**
   * 取得加密後的密碼
   */
  getHashed(): string {
    return this.hashedPassword
  }

  /**
   * 轉換為字符串（返回加密密碼）
   */
  toString(): string {
    return this.hashedPassword
  }
}
