import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'

type RenderFn = (data: Record<string, unknown>) => string

export interface InertiaPageData {
  component: string
  props: Record<string, unknown>
  url: string
  version: string
}

export class InertiaService {
  constructor(
    private readonly renderTemplate: RenderFn,
    private readonly viteTags: string,
    private readonly assetVersion: string,
  ) {}

  render(ctx: IHttpContext, component: string, props: Record<string, unknown>): Response {
    const sharedProps = ctx.get<Record<string, unknown>>('inertia:shared') ?? {}
    const mergedProps = { ...sharedProps, ...props }

    const pageData: InertiaPageData = {
      component,
      props: mergedProps,
      url: ctx.getPathname(),
      version: this.assetVersion,
    }

    const isInertia =
      ctx.getHeader('x-inertia') === 'true' || ctx.getHeader('X-Inertia') === 'true'

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
