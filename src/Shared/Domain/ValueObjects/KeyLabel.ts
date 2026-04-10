export class KeyLabel {
  private readonly value: string

  constructor(raw: string) {
    const trimmed = raw.trim()
    if (!trimmed) {
      throw new Error('Key label 不能為空')
    }
    if (trimmed.length > 100) {
      throw new Error('Key label 不能超過 100 字元')
    }
    this.value = trimmed
  }

  getValue(): string {
    return this.value
  }

  equals(other: unknown): boolean {
    return other instanceof KeyLabel && other.value === this.value
  }
}
