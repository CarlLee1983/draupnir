import { createHttpTester } from '@gravito/core'
import type { PlanetCore } from '@gravito/core'

export interface RequestOptions {
  readonly body?: unknown
  readonly headers?: Readonly<Record<string, string>>
  readonly query?: Readonly<Record<string, string | number | boolean>>
}

/**
 * In-process HTTP client.
 *
 * Delegates to Gravito's own HttpTester so acceptance tests can traverse the
 * full middleware stack without a real network listener.
 */
export class InProcessHttpClient {
  private readonly tester: ReturnType<typeof createHttpTester>

  constructor(core: PlanetCore) {
    this.tester = createHttpTester(core)
  }

  get(path: string, options?: RequestOptions): Promise<Response> {
    return this.send('GET', path, options)
  }

  post(path: string, options?: RequestOptions): Promise<Response> {
    return this.send('POST', path, options)
  }

  patch(path: string, options?: RequestOptions): Promise<Response> {
    return this.send('PATCH', path, options)
  }

  delete(path: string, options?: RequestOptions): Promise<Response> {
    return this.send('DELETE', path, options)
  }

  private async send(
    method: string,
    path: string,
    options: RequestOptions = {},
  ): Promise<Response> {
    const headers = this.prepareHeaders(method, options)
    const query = options.query

    const target = query ? this.appendQuery(path, query) : path

    const response =
      method === 'GET'
        ? await this.tester.get(target, headers)
        : method === 'POST'
          ? await this.tester.post(target, options.body, headers)
          : method === 'PATCH'
            ? await this.tester.patch(target, options.body, headers)
            : await this.tester.delete(target, options.body, headers)

    return response.response
  }

  private prepareHeaders(method: string, options: RequestOptions): Record<string, string> {
    const headers = { ...(options.headers ?? {}) }
    if (method === 'GET' || options.body === undefined || options.body === null) {
      return headers
    }

    if (headers['content-length'] === undefined && headers['Content-Length'] === undefined) {
      const body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body)
      headers['Content-Length'] = String(new TextEncoder().encode(body).byteLength)
    }

    return headers
  }

  private appendQuery(
    path: string,
    query: Readonly<Record<string, string | number | boolean>>,
  ): string {
    const url = new URL(path, 'http://acceptance.test')
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, String(value))
    }
    return `${url.pathname}${url.search}`
  }
}
