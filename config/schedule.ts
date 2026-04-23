import { Cron } from 'croner'

/**
 * 驗證 Cron 字串格式是否正確
 */
function validateCron(value: string, jobName: string): string {
  try {
    new Cron(value, { paused: true })
    return value
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Invalid Cron for ${jobName}: "${value}" \u2014 ${message}`)
  }
}

export default {
  /**
   * Bifrost 用量同步任務
   */
  bifrostSync: {
    cron: validateCron(process.env.BIFROST_SYNC_CRON ?? '*/5 * * * *', 'bifrostSync'),
    runOnInit: true,
  },

  /**
   * 您可以在此處輕鬆新增其他任務的獨立設定
   * 例如：
   * jobA: {
   *   cron: validateCron(process.env.JOB_A_CRON ?? '0 * * * *', 'jobA'),
   * },
   */
} as const
