import type { IShutdownHook } from '../IShutdownHook'

/**
 * Message Queue drain hook（占位）。
 *
 * 當 MQ 實作完成後，傳入支援 drain 的 MQ client，
 * 並在此呼叫「停止消費 → 等處理中訊息完成」的邏輯。
 */
export class MessageQueueShutdownHook implements IShutdownHook {
  readonly name = 'MessageQueue'

  async shutdown(): Promise<void> {
    // 占位：MQ 尚未實作，直接結束
  }
}
