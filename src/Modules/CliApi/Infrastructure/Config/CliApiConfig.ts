// src/Modules/CliApi/Infrastructure/Config/CliApiConfig.ts
import { z } from 'zod'

const CliApiConfigSchema = z.object({
  deviceCodeTtlSeconds: z.number().int().positive().default(600),
  pollingIntervalSeconds: z.number().int().positive().default(5),
  verificationUri: z.string().url(),
  /** Only in-memory store is implemented; other values are rejected at parse time. */
  deviceCodeStoreType: z.literal('memory').default('memory'),
})

export type CliApiConfig = z.infer<typeof CliApiConfigSchema>

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (value === undefined || value === '') return fallback
  const n = Number.parseInt(value, 10)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

export function loadCliApiConfig(): CliApiConfig {
  const verificationUri =
    process.env.CLI_VERIFICATION_URI?.trim() ||
    process.env.VERIFICATION_URI?.trim() ||
    'http://localhost:3000/verify-device'

  const storeRaw = (process.env.DEVICE_CODE_STORE_TYPE ?? 'memory').toLowerCase()
  if (storeRaw !== 'memory') {
    throw new Error(
      `DEVICE_CODE_STORE_TYPE="${storeRaw}" is not supported; only "memory" is available.`,
    )
  }

  return CliApiConfigSchema.parse({
    deviceCodeTtlSeconds: parsePositiveInt(process.env.DEVICE_CODE_TTL_SECONDS, 600),
    pollingIntervalSeconds: parsePositiveInt(process.env.CLI_POLLING_INTERVAL_SECONDS, 5),
    verificationUri,
    deviceCodeStoreType: 'memory',
  })
}
