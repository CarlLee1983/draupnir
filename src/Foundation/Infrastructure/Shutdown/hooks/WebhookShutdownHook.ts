import type { IShutdownHook } from '../IShutdownHook'

/**
 * Webhook long-lived connection 關閉 hook（占位）。
 *
 * WebhookDispatcher 目前為無狀態 fetch client，無持久連線需關閉。
 * 未來若引入 WebSocket 或持久連線，在此實作關閉邏輯。
 */
export class WebhookShutdownHook implements IShutdownHook {
  readonly name = 'WebhookClient'

  async shutdown(): Promise<void> {
    // 占位：WebhookDispatcher 無持久連線，直接結束
  }
}
