export type ReportType = 'weekly' | 'monthly'

export interface ReportScheduleProps {
  id?: string
  orgId: string
  type: ReportType
  day: number // 1-7 for weekly (1=Monday), 1-31 for monthly
  time: string // HH:mm
  timezone: string
  recipients: string[]
  enabled: boolean
}

export class ReportSchedule {
  private constructor(public readonly props: Required<ReportScheduleProps>) {}

  static create(props: ReportScheduleProps): ReportSchedule {
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/
    if (!timeRegex.test(props.time)) {
      throw new Error(`Invalid time format: ${props.time}. Expected HH:mm.`)
    }

    return new ReportSchedule({
      id: props.id ?? crypto.randomUUID(),
      orgId: props.orgId,
      type: props.type,
      day: props.day,
      time: props.time,
      timezone: props.timezone,
      recipients: props.recipients,
      enabled: props.enabled,
    })
  }

  get id(): string {
    return this.props.id
  }

  get orgId(): string {
    return this.props.orgId
  }

  get type(): ReportType {
    return this.props.type
  }

  get day(): number {
    return this.props.day
  }

  get time(): string {
    return this.props.time
  }

  get timezone(): string {
    return this.props.timezone
  }

  get recipients(): string[] {
    return this.props.recipients
  }

  get enabled(): boolean {
    return this.props.enabled
  }

  get cronString(): string {
    const [hourStr, minuteStr] = this.props.time.split(':')
    const hour = parseInt(hourStr, 10)
    const minute = parseInt(minuteStr, 10)

    if (this.props.type === 'weekly') {
      // 0 9 * * 1 (Minute Hour Dom Mon Dow)
      // Note: croner and most cron engines use 0-6 for Sun-Sat or 1-7 for Mon-Sun
      // The test expects 1 for Monday
      return `${minute} ${hour} * * ${this.props.day}`
    }

    // monthly: 0 9 1 * *
    return `${minute} ${hour} ${this.props.day} * *`
  }
}
