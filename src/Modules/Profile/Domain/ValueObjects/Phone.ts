export class Phone {
  private readonly value: string

  constructor(phone: string) {
    const cleaned = phone.replace(/[\s\-\(\)]/g, '')
    if (!this.isValid(cleaned)) {
      throw new Error(`無效的電話號碼格式: ${phone}`)
    }
    this.value = cleaned
  }

  static fromNullable(phone: string | null | undefined): Phone | null {
    if (!phone || phone.trim() === '') return null
    return new Phone(phone)
  }

  private isValid(phone: string): boolean {
    const phoneRegex = /^\+?[0-9]{7,15}$/
    return phoneRegex.test(phone)
  }

  getValue(): string {
    return this.value
  }

  equals(other: Phone): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }
}
