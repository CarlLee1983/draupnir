/**
 * Email 值物件
 *
 * 責任：
 * - 電子郵件格式驗證
 * - 邂逅郵件的一致性和不變性
 */

export class Email {
  private readonly value: string

  /**
   * 建立 Email 值物件
   * @param email 電子郵件地址
   * @throws Error 如果格式無效
   */
  constructor(email: string) {
    if (!this.isValid(email)) {
      throw new Error(`無效的電子郵件格式: ${email}`)
    }
    this.value = email.toLowerCase()
  }

  /**
   * 驗證電子郵件格式
   */
  private isValid(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email) && email.length <= 255
  }

  /**
   * 取得電子郵件值
   */
  getValue(): string {
    return this.value
  }

  /**
   * 比較兩個 Email 物件
   */
  equals(other: Email): boolean {
    return this.value === other.value
  }

  /**
   * 轉換為字符串
   */
  toString(): string {
    return this.value
  }
}
