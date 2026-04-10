import type { PlanetCore } from '@gravito/core'
import type { FormRequestClass } from '@gravito/core'
import { fromGravitoContext } from '@/Shared/Presentation/IHttpContext'
import type { IModuleRouter, RouteHandler, Middleware } from '@/Shared/Presentation/IModuleRouter'

const FORM_REQUEST_SYMBOL = Symbol.for('gravito.formRequest')

function isFormRequestClass(value: unknown): value is FormRequestClass {
  if (typeof value !== 'function') return false
  if ((value as any)[FORM_REQUEST_SYMBOL] === true) return true
  if (value.prototype && typeof value.prototype.validate === 'function') return true
  return false
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
  return (ctx: any) => handler(fromGravitoContext(ctx))
}

export function createGravitoModuleRouter(core: PlanetCore, prefix = ''): IModuleRouter {
  function register(method: 'get' | 'post' | 'put' | 'patch' | 'delete') {
    return (path: string, ...args: unknown[]) => {
      const fullPath = prefix + path
      const handler = args[args.length - 1] as RouteHandler
      const wrapped = wrapHandler(handler)

      // (path, FormRequest, handler)
      if (args.length === 2 && isFormRequestClass(args[0])) {
        core.router[method](fullPath, args[0] as FormRequestClass, wrapped)
        return
      }

      // (path, middlewares[], FormRequest, handler)
      if (args.length === 3 && Array.isArray(args[0]) && isFormRequestClass(args[1])) {
        const middlewares = args[0] as Middleware[]
        const formRequest = args[1] as FormRequestClass
        const pipeline = runPipeline(
          middlewares,
          (ctx) =>
            new Promise((resolve) => {
              // Pass the request that has already passed through middlewares to core.router to handle FormRequest
              // Use pipeline wrapper to ensure middlewares execute first
              resolve(handler(ctx))
            }),
        )
        // Run the middleware pipeline first, then let the core handle FormRequest
        core.router[method](fullPath, formRequest, (ctx: any) => pipeline(fromGravitoContext(ctx)))
        return
      }

      // (path, handler) or (path, middlewares[], handler) — Existing logic
      const middlewares = args.length > 1 ? (args[0] as Middleware[]) : []
      const pipeline = runPipeline(middlewares, handler)
      core.router[method](fullPath, (ctx: any) => pipeline(fromGravitoContext(ctx)))
    }
  }


  return {
    get: register('get') as IModuleRouter['get'],
    post: register('post') as IModuleRouter['post'],
    put: register('put') as IModuleRouter['put'],
    patch: register('patch') as IModuleRouter['patch'],
    delete: register('delete') as IModuleRouter['delete'],
    head: (path, handler) => {
      core.router.get(prefix + path, (ctx: any) => handler(fromGravitoContext(ctx)))
    },
    options: (path, handler) => {
      const fullPath = prefix + path
      const r = core.router as any
      if (r.options && typeof r.options === 'function') {
        r.options(fullPath, (ctx: any) => handler(fromGravitoContext(ctx)))
      } else {
        r.get(fullPath, (ctx: any) => handler(fromGravitoContext(ctx)))
      }
    },
    group(groupPrefix, fn) {
      fn(createGravitoModuleRouter(core, prefix + groupPrefix))
    },
  }
}
