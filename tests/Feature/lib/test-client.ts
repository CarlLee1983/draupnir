export interface TestResponse {
	status: number
	json: unknown
	headers: Headers
}

interface ErrorInfo {
	method: string
	path: string
	requestBody?: unknown
	status: number
	expectedStatus: number
	responseBody?: unknown
}

export class TestClient {
	constructor(private baseURL: string) {}

	getBaseURL(): string {
		return this.baseURL
	}

	async request(
		operation: { method: string; path: string },
		options: { body?: unknown; auth?: string | null; headers?: Record<string, string> },
	): Promise<TestResponse> {
		const headers: Record<string, string> = {}
		const hasBody = options.body !== undefined && options.body !== null
		if (hasBody) {
			headers['content-type'] = 'application/json'
		}
		if (options.auth) {
			headers.authorization = `Bearer ${options.auth}`
		}
		if (options.headers) {
			for (const [key, value] of Object.entries(options.headers)) {
				headers[key] = value
			}
		}

		const url = `${this.baseURL}${operation.path}`
		const res = await fetch(url, {
			method: operation.method.toUpperCase(),
			headers,
			body: hasBody ? JSON.stringify(options.body) : undefined,
		})

		const contentType = res.headers.get('content-type') ?? ''
		const json = contentType.includes('json') ? await res.json() : null

		return { status: res.status, json, headers: res.headers }
	}

	async post(path: string, body: unknown, options?: { headers?: Record<string, string> }): Promise<TestResponse> {
		return this.request({ method: 'post', path }, { body, headers: options?.headers })
	}

	async get(path: string, auth?: string): Promise<TestResponse> {
		return this.request({ method: 'get', path }, { auth })
	}

	async put(path: string, body: unknown, options?: { headers?: Record<string, string> }): Promise<TestResponse> {
		return this.request({ method: 'put', path }, { body, headers: options?.headers })
	}

	async patch(path: string, body: unknown, options?: { headers?: Record<string, string> }): Promise<TestResponse> {
		return this.request({ method: 'patch', path }, { body, headers: options?.headers })
	}

	async delete(path: string, options?: { headers?: Record<string, string> }): Promise<TestResponse> {
		return this.request({ method: 'delete', path }, { headers: options?.headers })
	}

	formatError(info: ErrorInfo): string {
		const lines = [
			`  Status: expected ${info.expectedStatus}, got ${info.status}`,
			'',
			'  Request:',
			`    ${info.method.toUpperCase()} ${this.baseURL}${info.path}`,
		]
		if (info.requestBody) {
			lines.push(`    Body: ${JSON.stringify(info.requestBody)}`)
		}
		lines.push('', '  Response:', `    Status: ${info.status}`)
		if (info.responseBody) {
			lines.push(`    Body: ${JSON.stringify(info.responseBody)}`)
		}
		return lines.join('\n')
	}
}
