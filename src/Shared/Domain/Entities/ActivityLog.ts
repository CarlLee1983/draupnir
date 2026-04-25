/**
 * ActivityLog Entity
 * Represents a record of a specific user action or system event.
 */
export class ActivityLog {
  private constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly action: string,
    public readonly targetId: string,
    public readonly metadata: Record<string, unknown>,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  /**
   * Factory method to create a new ActivityLog.
   * Encapsulates ID generation and initial state.
   */
  static create(
    userId: string,
    action: string,
    targetId: string,
    metadata: Record<string, unknown>,
  ): ActivityLog {
    const now = new Date()
    return new ActivityLog(
      crypto.randomUUID(),
      userId,
      action,
      targetId,
      metadata,
      now,
      now,
    )
  }

  /**
   * Reconstitutes an ActivityLog from persistence.
   */
  static reconstitute(props: {
    id: string
    userId: string
    action: string
    targetId: string
    metadata: Record<string, unknown>
    createdAt: Date
    updatedAt: Date
  }): ActivityLog {
    return new ActivityLog(
      props.id,
      props.userId,
      props.action,
      props.targetId,
      props.metadata,
      props.createdAt,
      props.updatedAt,
    )
  }
}
