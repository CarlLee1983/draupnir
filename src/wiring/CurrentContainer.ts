/**
 * 當前應用使用的 IContainer 映射
 *
 * 由 bootstrap 設定一次，各 Middleware 或非 DI 注入的場景需要時透過 getCurrentContainer() 取得。
 */

import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'

let current: IContainer | null = null

/**
 * 設定當前應用的 IContainer（僅由 bootstrap 呼叫一次）
 */
export function setCurrentContainer(container: IContainer): void {
  current = container
}

/**
 * 取得當前應用的 IContainer
 */
export function getCurrentContainer(): IContainer {
  if (current === null) {
    throw new Error(
      'IContainer 尚未設定。請在 bootstrap 中呼叫 setCurrentContainer(container)。',
    )
  }
  return current
}

/**
 * 是否已設定當前 IContainer
 */
export function hasCurrentContainer(): boolean {
  return current !== null
}
