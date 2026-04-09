/**
 * Password 值物件
 *
 * 責任：
 * - 只保存已雜湊的密碼字串
 * - 不處理 hashing 或驗證
 */

export class Password {
  private readonly hashedPassword: string

  private constructor(hashedPassword: string) {
    if (!hashedPassword || hashedPassword.trim() === '') {
      throw new Error('無效的密碼雜湊')
    }

    this.hashedPassword = hashedPassword
  }

  static fromHashed(hashedPassword: string): Password {
    return new Password(hashedPassword)
  }

  getHashed(): string {
    return this.hashedPassword
  }

  toString(): string {
    return this.hashedPassword
  }
}
