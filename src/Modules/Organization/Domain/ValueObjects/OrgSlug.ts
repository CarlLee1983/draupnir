/**
 * OrgSlug Value Object
 * Handles URL-friendly identifier logic for organizations.
 */
export class OrgSlug {
  private readonly value: string

  /**
   * Creates an OrgSlug and validates its format.
   * @throws {Error} If the slug format is invalid.
   */
  constructor(slug: string) {
    const normalized = slug.toLowerCase().trim()
    if (!this.isValid(normalized)) {
      throw new Error(
        `Invalid organization slug: ${slug}. Only lowercase letters, numbers, and hyphens are allowed.`,
      )
    }
    this.value = normalized
  }

  /**
   * Generates a URL-friendly slug from a display name.
   */
  static fromName(name: string): OrgSlug {
    const slug = name
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')

    if (!slug) {
      const suffix = Math.random().toString(36).slice(2, 8)
      return new OrgSlug(`org-${suffix}`)
    }

    return new OrgSlug(slug)
  }

  private isValid(slug: string): boolean {
    if (!slug || slug.length === 0) return false
    if (slug.length > 100) return false
    return /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(slug)
  }

  /** Gets the underlying slug string. */
  getValue(): string {
    return this.value
  }

  /** Checks equality with another OrgSlug instance. */
  equals(other: OrgSlug): boolean {
    return this.value === other.value
  }

  /** Returns the slug string. */
  toString(): string {
    return this.value
  }
}
