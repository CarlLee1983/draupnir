import { readFileSync } from 'fs'

/**
 * Extract registered routes from *.routes.ts source files.
 */
export function extractRoutesFromSource(): string[] {
	const routes: string[] = []
	const glob = new Bun.Glob('src/Modules/*/Presentation/Routes/*.routes.ts')
	const routeFiles = [...glob.scanSync(process.cwd())]

	const routePattern = /router\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/g

	for (const file of routeFiles) {
		const content = readFileSync(file, 'utf-8')
		let match: RegExpExecArray | null
		while ((match = routePattern.exec(content)) !== null) {
			const method = match[1].toUpperCase()
			const path = match[2]
			if (path.includes('__test__')) continue
			const normalizedPath = path.replace(/:(\w+)/g, '{$1}')
			routes.push(`${method} ${normalizedPath}`)
		}
	}

	return routes.sort()
}
