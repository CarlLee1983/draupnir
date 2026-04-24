/**
 * Represents the recurrence frequency of a report.
 * 'weekly' for once-a-week reports.
 * 'monthly' for once-a-month reports.
 */
export type ReportType = 'weekly' | 'monthly'

/**
 * Properties defining a ReportSchedule's state.
 */
export interface ReportScheduleProps {
  /** Unique identifier for the schedule. */
  id?: string
  /** ID of the organization this schedule belongs to. */
  orgId: string
  /** Recurrence frequency (weekly/monthly). */
  type: ReportType
  /** Day of the week (1-7, 1=Monday) or day of the month (1-31). */
  day: number
  /** Time of day to trigger the report in HH:mm format. */
  time: string
  /** Timezone for interpreting the 'time' property. */
  timezone: string
  /** List of email addresses to receive the report. */
  recipients: string[]
  /** Whether the schedule is currently active. */
  enabled: boolean
}

/**
 * ReportSchedule Aggregate Root
 * Manages the timing and distribution list for automated reports.
 *
 * Responsibilities:
 * - Define when and how often an organization receives reports.
 * - Validate time formats and recurrence parameters.
 * - Generate standard cron expressions for external schedulers.
 */
export class ReportSchedule {
  /**
   * Internal constructor for the ReportSchedule aggregate.
   * Use the `create` static factory method instead.
   *
   * @param props The full set of properties for the schedule.
   */
  private constructor(public readonly props: Required<ReportScheduleProps>) {}

  /**
   * Creates a new ReportSchedule with validation.
   *
   * @param props Initial properties for the schedule.
   * @throws Error if the time format is invalid.
   * @returns A new ReportSchedule instance.
   */
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

  /** Gets the unique identifier of the schedule. */
  get id(): string {
    return this.props.id
  }

  /** Gets the ID of the organization. */
  get orgId(): string {
    return this.props.orgId
  }

  /** Gets the recurrence frequency type. */
  get type(): ReportType {
    return this.props.type
  }

  /** Gets the day of week or month. */
  get day(): number {
    return this.props.day
  }

  /** Gets the HH:mm trigger time. */
  get time(): string {
    return this.props.time
  }

  /** Gets the timezone name. */
  get timezone(): string {
    return this.props.timezone
  }

  /** Gets the list of email recipients. */
  get recipients(): string[] {
    return this.props.recipients
  }

  /** Checks if the schedule is enabled. */
  get enabled(): boolean {
    return this.props.enabled
  }

  /**
   * Generates a standard 5-field cron expression for this schedule.
   * Format: 'minute hour day-of-month month day-of-week'.
   * 
   * @returns A cron string compatible with standard engines.
   */
  get cronString(): string {
    const [hourStr, minuteStr] = this.props.time.split(':')
    const hour = parseInt(hourStr, 10)
    const minute = parseInt(minuteStr, 10)

    if (this.props.type === 'weekly') {
      // 0 9 * * 1 (Minute Hour Dom Mon Dow)
      // Note: most cron engines use 1-7 for Mon-Sun
      return `${minute} ${hour} * * ${this.props.day}`
    }

    // monthly: 0 9 1 * *
    return `${minute} ${hour} ${this.props.day} * *`
  }
}
