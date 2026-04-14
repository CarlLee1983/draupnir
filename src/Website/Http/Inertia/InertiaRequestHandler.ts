import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'

type RenderFn = (data: Record<string, unknown>) => string

/** Serialized Inertia page object returned for XHR or embedded in full HTML. */
export interface InertiaPageData {
  component: string
  props: Record<string, unknown>
  url: string
  version: string
}

/**
 * Server-side Inertia adapter: merges shared props, negotiates version, returns JSON or HTML shell.
 *
 * Full-page loads embed `page` JSON in the SSR template; `X-Inertia: true` requests return JSON only.
 */
export class InertiaService {
  constructor(
    private readonly renderTemplate: RenderFn,
    private readonly viteTags: string,
    private readonly assetVersion: string,
  ) {}

  /**
   * Renders an Inertia response for the given React page key and props.
   *
   * Merges `ctx` key `inertia:shared` (from `SharedDataMiddleware`) into props before rendering.
   *
   * @param ctx - HTTP context; must expose pathname and optional Inertia headers.
   * @param component - Frontend page identifier (e.g. `Admin/Dashboard/Index`).
   * @param props - Page-specific props merged after shared props.
   * @returns JSON when `X-Inertia` is true; full HTML otherwise. Returns 409 with `X-Inertia-Location`
   *   when the client asset version mismatches {@link InertiaService}'s version in production builds.
   */
  render(ctx: IHttpContext, component: string, props: Record<string, unknown>): Response {
    const sharedProps = ctx.get<Record<string, unknown>>('inertia:shared') ?? {}
    const mergedProps = { ...sharedProps, ...props }

    const pageData: InertiaPageData = {
      component,
      props: mergedProps,
      url: ctx.getPathname(),
      version: this.assetVersion,
    }

    const isInertia = ctx.getHeader('x-inertia') === 'true' || ctx.getHeader('X-Inertia') === 'true'

    if (isInertia) {
      const clientVersion = ctx.getHeader('x-inertia-version') ?? ctx.getHeader('X-Inertia-Version')

      if (clientVersion && clientVersion !== this.assetVersion) {
        return new Response('', {
          status: 409,
          headers: { 'X-Inertia-Location': ctx.getPathname() },
        })
      }

      return Response.json(pageData, {
        headers: {
          'X-Inertia': 'true',
          Vary: 'X-Inertia',
        },
      })
    }

    const pageJson = JSON.stringify(pageData)
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e')
      .replace(/&/g, '\\u0026')
      .replace(/'/g, '\\u0027')

    const html = this.renderTemplate({
      page: pageJson,
      viteTags: this.viteTags,
    })

    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }
}
