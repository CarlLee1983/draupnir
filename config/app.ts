/**
 * Application configuration.
 * Used by PlanetCore (PORT, APP_NAME) and views (VIEW_DIR).
 */
import { Cron } from 'croner'

export function parseBifrostSyncCron(value: string): string {
	try {
		new Cron(value, { paused: true })
		return value
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		throw new Error(`Invalid BIFROST_SYNC_CRON: "${value}" — ${message}`)
	}
}

export default {
	name: process.env.APP_NAME ?? 'draupnir',
	env: process.env.APP_ENV ?? 'development',
	port: Number.parseInt(process.env.PORT ?? '3000', 10),
	VIEW_DIR: process.env.VIEW_DIR ?? 'src/views',
	debug: process.env.APP_DEBUG === 'true',
	url: process.env.APP_URL ?? 'http://localhost:3000',
	bifrostSyncCron: parseBifrostSyncCron(process.env.BIFROST_SYNC_CRON ?? '*/5 * * * *'),
} as const
