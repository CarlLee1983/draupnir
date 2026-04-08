/**
 * Auth 模組路由
 *
 * 框架無關的路由定義
 * 使用 IModuleRouter 介面實現框架解耦
 */

import type { IModuleRouter } from '@/Shared/Presentation/IModuleRouter'
import type { AuthController } from '../Controllers/AuthController'

/**
 * 註冊 Auth 模組路由
 * @param router 框架無關的模組路由器
 * @param controller 認證控制器
 */
export async function registerAuthRoutes(
  router: IModuleRouter,
  controller: AuthController
): Promise<void> {
  // 公開端點（無需認證）
  router.post('/api/auth/register', (ctx) => controller.register(ctx))
  router.post('/api/auth/login', (ctx) => controller.login(ctx))
  router.post('/api/auth/refresh', (ctx) => controller.refresh(ctx))

  // 受保護端點（需要認證）
  router.post('/api/auth/logout', (ctx) => controller.logout(ctx))
}
