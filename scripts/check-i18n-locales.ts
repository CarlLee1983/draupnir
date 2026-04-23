#!/usr/bin/env bun

import { readdirSync } from 'node:fs'
import { loadMessages, supportedLocales } from '../src/Shared/Infrastructure/I18n/loadMessages'

function joinPath(...parts: string[]): string {
  return parts
    .map((p) => p.replace(/^\/|\/$/g, ''))
    .filter(Boolean)
    .join('/')
    .replace(/^/, parts[0].startsWith('/') ? '/' : '')
}

const localesDir = joinPath(import.meta.dir, '../src/Shared/Infrastructure/I18n/locales')
const localeFiles = readdirSync(localesDir, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
  .map((entry) => entry.name.replace(/\.ts$/, ''))
  .sort()
const expectedLocales = [...supportedLocales].sort()
const sampleExpectations: Record<(typeof supportedLocales)[number], [string, string]> = {
  'zh-TW': ['member.dashboard.selectOrg', '請先選擇組織'],
  en: ['member.dashboard.selectOrg', 'Please select an organization first'],
}

const errors: string[] = []

if (
  localeFiles.length !== expectedLocales.length ||
  localeFiles.some((file, index) => file !== expectedLocales[index])
) {
  errors.push(
    [
      'Locale files do not match supportedLocales.',
      `  files: ${localeFiles.join(', ') || '(none)'}`,
      `  supportedLocales: ${expectedLocales.join(', ') || '(none)'}`,
    ].join('\n'),
  )
}

for (const locale of supportedLocales) {
  const messages = loadMessages(locale)
  const fallback = loadMessages(locale, { 'ui.common.save': undefined })
  const [sampleKey, sampleValue] = sampleExpectations[locale]

  if (messages[sampleKey] !== sampleValue) {
    errors.push(`Locale "${locale}" did not load the expected catalog value for "${sampleKey}".`)
  }

  if (fallback['ui.common.save'] !== 'ui.common.save') {
    errors.push(`Locale "${locale}" did not preserve missing-key fallback behavior.`)
  }
}

if (errors.length > 0) {
  console.error('i18n locale check failed:')
  for (const error of errors) {
    console.error(`- ${error}`)
  }
  process.exit(1)
}

console.log(`i18n locale check passed (${expectedLocales.join(', ')})`)
