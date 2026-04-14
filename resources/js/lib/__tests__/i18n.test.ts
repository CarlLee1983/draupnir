import { afterEach, beforeEach, describe, expect, it, vi } from 'bun:test'
import { createTranslator } from '../i18n'
import type { MessageKey, Messages } from '../i18n'

const sampleMessages: Partial<Messages> = {
  'member.dashboard.selectOrg': '請先選擇組織',
  'auth.logout.unauthorized': '未經授權',
  'member.usage.loadFailed': '讀取用量失敗: {reason}',
}

describe('createTranslator', () => {
  describe('key exists', () => {
    it('returns the translated string', () => {
      const t = createTranslator(sampleMessages)
      expect(t('member.dashboard.selectOrg')).toBe('請先選擇組織')
    })

    it('returns translation with single param interpolated', () => {
      const t = createTranslator(sampleMessages)
      expect(t('member.usage.loadFailed', { reason: 'timeout' })).toBe('讀取用量失敗: timeout')
    })

    it('leaves unmatched param placeholders intact', () => {
      const t = createTranslator(sampleMessages)
      expect(t('member.usage.loadFailed', {})).toBe('讀取用量失敗: {reason}')
    })
  })

  describe('key missing', () => {
    let warnSpy: ReturnType<typeof vi.spyOn>
    let originalNodeEnv: string | undefined

    beforeEach(() => {
      warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      // Ensure NODE_ENV is 'test' (not 'production') so warnings fire
      originalNodeEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'test'
    })

    afterEach(() => {
      warnSpy.mockRestore()
      process.env.NODE_ENV = originalNodeEnv
    })

    it('returns the key as fallback', () => {
      const t = createTranslator({})
      const key: MessageKey = 'admin.contracts.missingId'
      expect(t(key)).toBe(key)
    })

    it('emits a console.warn in non-production environment', () => {
      const t = createTranslator({})
      const key: MessageKey = 'admin.contracts.missingId'
      t(key)
      expect(warnSpy).toHaveBeenCalledOnce()
      expect(warnSpy).toHaveBeenCalledWith(
        `[i18n] Missing translation key: "${key}"`,
      )
    })

    it('does not warn in production environment', () => {
      process.env.NODE_ENV = 'production'
      const t = createTranslator({})
      t('admin.contracts.missingId')
      expect(warnSpy).not.toHaveBeenCalled()
    })
  })

  describe('param interpolation', () => {
    it('handles multiple params', () => {
      const t = createTranslator({ 'admin.contracts.missingId': 'Contract {id} for org {org} missing' })
      expect(t('admin.contracts.missingId', { id: '42', org: 'Acme' })).toBe(
        'Contract 42 for org Acme missing',
      )
    })

    it('handles numeric param values', () => {
      const t = createTranslator({ 'admin.contracts.missingId': 'Page {page} of {total}' })
      expect(t('admin.contracts.missingId', { page: 1, total: 10 })).toBe('Page 1 of 10')
    })

    it('returns unchanged string when no params given', () => {
      const t = createTranslator(sampleMessages)
      expect(t('auth.logout.unauthorized')).toBe('未經授權')
    })
  })
})
