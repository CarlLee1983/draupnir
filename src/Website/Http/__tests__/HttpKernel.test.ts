import { describe, expect, it } from 'vitest'
import { HttpKernel } from '../HttpKernel'

describe('HttpKernel', () => {
  describe('global()', () => {
    it('至少包含 SecurityHeaders middleware', () => {
      const global = HttpKernel.global()
      expect(global.length).toBeGreaterThanOrEqual(1)
      expect(typeof global[0]).toBe('function')
    })

    it('每次呼叫回傳新陣列（不可變）', () => {
      expect(HttpKernel.global()).not.toBe(HttpKernel.global())
    })
  })

  describe('groups', () => {
    it('web group 包含 4 個 middleware（jwt + csrf + sharedData + pendingCookies）', () => {
      expect(HttpKernel.groups.web()).toHaveLength(4)
    })

    it('admin group 包含 5 個 middleware（web 基底 + requireAdmin + pendingCookies）', () => {
      expect(HttpKernel.groups.admin()).toHaveLength(5)
    })

    it('member group 包含 5 個 middleware（web 基底 + requireMember + pendingCookies）', () => {
      expect(HttpKernel.groups.member()).toHaveLength(5)
    })

    it('所有 group middleware 都是函式', () => {
      for (const group of ['web', 'admin', 'member'] as const) {
        for (const mw of HttpKernel.groups[group]()) {
          expect(typeof mw).toBe('function')
        }
      }
    })

    it('每次呼叫回傳新陣列', () => {
      expect(HttpKernel.groups.web()).not.toBe(HttpKernel.groups.web())
    })
  })
})
