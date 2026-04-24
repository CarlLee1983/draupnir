import type { FormRequestClass, PlanetCore } from '@gravito/core'
import { fromGravitoContext } from '@/Shared/Presentation/IHttpContext'
import type {
  IModuleRouter,
  Middleware,
  ModuleRouteOptions,
  RouteHandler,
} from '@/Shared/Presentation/IModuleRouter'

const FORM_REQUEST_SYMBOL = Symbol.for('gravito.formRequest')

function isFormRequestClass(value: unknown): value is FormRequestClass {
  if (typeof value !== 'function') return false
  // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
  if ((value as any)[FORM_REQUEST_SYMBOL] === true) return true
  if (value.prototype && typeof value.prototype.validate === 'function') return true
  return false
}

function isModuleRouteOptions(value: unknown): value is ModuleRouteOptions {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }
  if (isFormRequestClass(value)) {
    return false
  }
  const o = value as Record<string, unknown>
  const keys = Object.keys(o)
  if (keys.length === 0) {
    return true
  }
  return keys.every((k) => k === 'name') && (o.name === undefined || typeof o.name === 'string')
}

function applyRouteName(route: unknown, options?: ModuleRouteOptions): void {
  if (!options?.name || route === null || route === undefined) {
    return
  }
  const r = route as { name?: (n: string) => unknown }
  if (typeof r.name === 'function') {
    r.name(options.name)
  }
}

function runPipeline(middlewares: Middleware[], handler: RouteHandler): RouteHandler {
  return (ctx) => {
    let index = -1
    const dispatch = (i: number): Promise<Response> => {
      if (i <= index) return Promise.reject(new Error('next() called multiple times'))
      index = i
      if (i === middlewares.length) return handler(ctx)
      return middlewares[i](ctx, () => dispatch(i + 1))
    }
    return dispatch(0)
  }
}

function wrapHandler(handler: RouteHandler) {
  // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
  return (ctx: any) => handler(fromGravitoContext(ctx))
}

export function createGravitoModuleRouter(core: PlanetCore, prefix = ''): IModuleRouter {
  function register(method: 'get' | 'post' | 'put' | 'patch' | 'delete') {
    return (path: string, ...args: unknown[]) => {
      const fullPath = prefix + path
      const raw = [...args]
      let options: ModuleRouteOptions | undefined
      if (raw.length > 0 && isModuleRouteOptions(raw[raw.length - 1])) {
        options = raw.pop() as ModuleRouteOptions
      }

      const handler = raw[raw.length - 1] as RouteHandler
      const wrapped = wrapHandler(handler)

      if (raw.length === 2 && isFormRequestClass(raw[0])) {
        const route = core.router[method](fullPath, raw[0] as FormRequestClass, wrapped)
        applyRouteName(route, options)
        return
      }

      if (raw.length === 3 && Array.isArray(raw[0]) && isFormRequestClass(raw[1])) {
        const middlewares = raw[0] as Middleware[]
        const formRequest = raw[1] as FormRequestClass
        const pipeline = runPipeline(
          middlewares,
          (ctx) =>
            new Promise((resolve) => {
              resolve(handler(ctx))
            }),
        )
        // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
        const route = core.router[method](fullPath, formRequest, (ctx: any) =>
          pipeline(fromGravitoContext(ctx)),
        )
        applyRouteName(route, options)
        return
      }

      const middlewares = raw.length > 1 ? (raw[0] as Middleware[]) : []
      const pipeline = runPipeline(middlewares, handler)
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      const route = core.router[method](fullPath, (ctx: any) => pipeline(fromGravitoContext(ctx)))
      applyRouteName(route, options)
    }
  }

  return {
    get: register('get') as IModuleRouter['get'],
    post: register('post') as IModuleRouter['post'],
    put: register('put') as IModuleRouter['put'],
    patch: register('patch') as IModuleRouter['patch'],
    delete: register('delete') as IModuleRouter['delete'],
    head: (path, handler, options) => {
      const fullPath = prefix + path
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      const route = core.router.get(fullPath, (ctx: any) => handler(fromGravitoContext(ctx)))
      applyRouteName(route, options)
    },
    options: (path, handler, options) => {
      const fullPath = prefix + path
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      const r = core.router as any
      let route: unknown
      if (r.options && typeof r.options === 'function') {
        // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
        route = r.options(fullPath, (ctx: any) => handler(fromGravitoContext(ctx)))
      } else {
        // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
        route = r.get(fullPath, (ctx: any) => handler(fromGravitoContext(ctx)))
      }
      applyRouteName(route, options)
    },
    group(groupPrefix, fn) {
      fn(createGravitoModuleRouter(core, prefix + groupPrefix))
    },
  }
}
