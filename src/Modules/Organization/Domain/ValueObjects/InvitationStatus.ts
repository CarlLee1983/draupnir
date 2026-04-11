export enum InvitationStatusType {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

export class InvitationStatus {
  private readonly value: InvitationStatusType

  constructor(status: string) {
    if (!Object.values(InvitationStatusType).includes(status as InvitationStatusType)) {
      throw new Error(`Invalid invitation status: ${status}`)
    }
    this.value = status as InvitationStatusType
  }

  getValue(): InvitationStatusType {
    return this.value
  }

  isPending(): boolean {
    return this.value === InvitationStatusType.PENDING
  }

  isAccepted(): boolean {
    return this.value === InvitationStatusType.ACCEPTED
  }

  toString(): string {
    return this.value
  }

  equals(other: unknown): boolean {
    return other instanceof InvitationStatus && other.value === this.value
  }
}
