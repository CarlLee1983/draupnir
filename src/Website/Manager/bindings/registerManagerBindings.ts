/**
 * Registers manager Inertia page classes as container singletons.
 * 每個 page 的 binding 會在該 page 的實作任務中新增（Phase F–K）。
 */
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'

export function registerManagerBindings(_container: IContainer): void {
  // 後續在 Phase F–K 各任務中新增每個 page 的 binding。
}
