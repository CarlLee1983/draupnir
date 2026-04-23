import { describe, expect, test } from 'bun:test'
import { readdirSync } from 'node:fs'
import { loadMessages, supportedLocales } from '../loadMessages'

function joinPath(...parts: string[]): string {
  return parts
    .map((p) => p.replace(/^\/|\/$/g, ''))
    .filter(Boolean)
    .join('/')
    .replace(/^/, parts[0].startsWith('/') ? '/' : '')
}

const localesDir = joinPath(import.meta.dir, '../locales')

describe('i18n locale registry', () => {
  test('keeps locale files aligned with the supported locale list', () => {
    const localeFiles = readdirSync(localesDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
      .map((entry) => entry.name.replace(/\.ts$/, ''))
      .sort()

    expect(localeFiles).toEqual([...supportedLocales].sort())
  })

  test('loads a message catalog for every supported locale', () => {
    for (const locale of supportedLocales) {
      const messages = loadMessages(locale)
      expect(messages['ui.common.save']).toBeDefined()
      expect(messages['member.dashboard.selectOrg']).toBeDefined()
    }
  })
})
