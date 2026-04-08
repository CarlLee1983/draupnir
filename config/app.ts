/**
 * Application configuration.
 * Used by PlanetCore (PORT, APP_NAME) and views (VIEW_DIR).
 */
export default {
	name: process.env.APP_NAME ?? 'draupnir',
	env: process.env.APP_ENV ?? 'development',
	port: Number.parseInt(process.env.PORT ?? '3000', 10),
	VIEW_DIR: process.env.VIEW_DIR ?? 'src/views',
	debug: process.env.APP_DEBUG === 'true',
	url: process.env.APP_URL ?? 'http://localhost:3000',
} as const
