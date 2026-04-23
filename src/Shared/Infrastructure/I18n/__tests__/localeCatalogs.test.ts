import { describe, expect, test } from 'bun:test'
import { enMessages } from '../locales/en'
import { zhTWMessages } from '../locales/zh-TW'

describe('i18n locale catalogs', () => {
  test('keeps zh-TW as the canonical key set for all locales', () => {
    const zhKeys = Object.keys(zhTWMessages).sort()
    const enKeys = Object.keys(enMessages).sort()

    expect(enKeys).toEqual(zhKeys)
  })
})
