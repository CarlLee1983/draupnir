/**
 * Graceful shutdown hook 介面。
 *
 * 每個需要在關閉時清理的資源都實作此介面，
 * 並透過 GracefulShutdown.register() 註冊。
 */
export interface IShutdownHook {
  /** 顯示在 log 中的資源名稱。 */
  readonly name: string
  /**
   * 執行清理邏輯。
   * - 應在 drainTimeout 內完成；超時由 GracefulShutdown 強制終止
   * - 丟出的 error 會被 catch 並 log，不影響其他 hook 執行
   */
  shutdown(): Promise<void>
}
