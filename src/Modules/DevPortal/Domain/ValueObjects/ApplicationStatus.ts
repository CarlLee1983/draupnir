export const ApplicationStatusValues = ['active', 'suspended', 'archived'] as const
export type ApplicationStatusType = (typeof ApplicationStatusValues)[number]

export class ApplicationStatus {
  private constructor(private readonly value: ApplicationStatusType) {}

  static active(): ApplicationStatus {
    return new ApplicationStatus('active')
  }

  static suspended(): ApplicationStatus {
    return new ApplicationStatus('suspended')
  }

  static archived(): ApplicationStatus {
    return new ApplicationStatus('archived')
  }

  static from(value: string): ApplicationStatus {
    if (!ApplicationStatusValues.includes(value as ApplicationStatusType)) {
      throw new Error(`無效的 Application 狀態: ${value}`)
    }
    return new ApplicationStatus(value as ApplicationStatusType)
  }

  isActive(): boolean {
    return this.value === 'active'
  }

  isSuspended(): boolean {
    return this.value === 'suspended'
  }

  isArchived(): boolean {
    return this.value === 'archived'
  }

  getValue(): ApplicationStatusType {
    return this.value
  }

  equals(other: unknown): boolean {
    return other instanceof ApplicationStatus && other.value === this.value
  }
}
