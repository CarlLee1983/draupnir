import { describe, expect, test } from 'bun:test'
import { loadMessages } from '../loadMessages'

describe('loadMessages', () => {
  test('returns the locale catalog as flat key/value pairs', () => {
    const messages = loadMessages('zh-TW')
    expect(messages['member.dashboard.selectOrg']).toBe('請先選擇組織')
  })

  test('falls back to the key when missing', () => {
    const messages = loadMessages('en', { 'admin.users.loadFailed': undefined })
    expect(messages['admin.users.loadFailed']).toBe('admin.users.loadFailed')
  })
})
