import { beforeEach, describe, expect, mock, test } from 'bun:test'
import type { IHttpContext, CookieOptions } from '@/Shared/Presentation/IHttpContext'
import type {
  IJwtTokenService,
  TokenSignPayload,
} from '@/Modules/Auth/Application/Ports/IJwtTokenService'
import { AuthToken, TokenType } from '@/Modules/Auth/Domain/ValueObjects/AuthToken'
import { OrganizationController } from '../../Presentation/Controllers/OrganizationController'

interface CookieCall {
  name: string
  value: string
  options: CookieOptions
}

interface JsonCall {
  body: unknown
  status: number
}

function createMockContext(authContext?: {
  userId: string
  email: string
  role: string
  permissions: string[]
  tokenType: string
}): {
  ctx: IHttpContext
  cookies: CookieCall[]
  jsonCalls: JsonCall[]
  store: Map<string, unknown>
} {
  const store = new Map<string, unknown>()
  if (authContext) store.set('auth', authContext)
  const cookies: CookieCall[] = []
  const jsonCalls: JsonCall[] = []
  const ctx: IHttpContext = {
    getBodyText: async () => '',
    getJsonBody: async <T>() => ({}) as T,
    getBody: async <T>() => ({}) as T,
    getHeader: () => undefined,
    getParam: () => undefined,
    getPathname: () => '/api/organizations',
    getMethod: () => 'POST',
    getQuery: () => undefined,
    params: {},
    query: {},
    headers: {},
    json: <T>(data: T, statusCode?: number) => {
      const status = statusCode ?? 200
      jsonCalls.push({ body: data, status })
      return Response.json(data as unknown as object, { status })
    },
    text: (content: string, statusCode?: number) =>
      new Response(content, { status: statusCode ?? 200 }),
    redirect: (url: string, statusCode?: number) => Response.redirect(url, statusCode ?? 302),
    get: <T>(key: string) => store.get(key) as T | undefined,
    set: (key: string, value: unknown) => {
      store.set(key, value)
    },
    getCookie: () => undefined,
    setCookie: (name: string, value: string, options?: CookieOptions) => {
      cookies.push({ name, value, options: options ?? {} })
    },
  }
  return { ctx, cookies, jsonCalls, store }
}

function makeJwtMock(tokenValue = 'new-access-token-abc') {
  const signAccessToken = mock((_payload: TokenSignPayload) => {
    return new AuthToken(
      tokenValue,
      new Date(Date.now() + 900 * 1000),
      TokenType.ACCESS,
    )
  })
  const signRefreshToken = mock((_payload: TokenSignPayload) => {
    throw new Error('signRefreshToken should not be called during create org')
  })
  const jwt: IJwtTokenService = {
    signAccessToken,
    signRefreshToken,
    verify: mock(() => null),
    decode: mock(() => null),
    isValid: mock(() => true),
    getTimeToExpire: mock(() => 900_000),
    isAboutToExpire: mock(() => false),
  }
  return { jwt, signAccessToken, signRefreshToken }
}

function makeController(overrides: {
  createOrgExecute?: ReturnType<typeof mock>
  jwt?: IJwtTokenService
} = {}): {
  controller: OrganizationController
  createOrgExecute: ReturnType<typeof mock>
  signAccessToken: ReturnType<typeof mock>
  signRefreshToken: ReturnType<typeof mock>
} {
  const createOrgExecute =
    overrides.createOrgExecute ??
    mock(async () => ({
      success: true,
      message: 'Organization established successfully',
      data: { id: 'org-1', name: 'Acme', slug: 'acme' },
    }))
  const { jwt, signAccessToken, signRefreshToken } = makeJwtMock()
  const passThrough = new Proxy(
    {},
    {
      get: () => () => {
        throw new Error('should not be called')
      },
    },
  )
  const controller = new OrganizationController(
    { execute: createOrgExecute } as any,
    passThrough as any,
    passThrough as any,
    passThrough as any,
    passThrough as any,
    passThrough as any,
    passThrough as any,
    passThrough as any,
    passThrough as any,
    passThrough as any,
    passThrough as any,
    passThrough as any,
    passThrough as any,
    passThrough as any,
    overrides.jwt ?? jwt,
  )
  return { controller, createOrgExecute, signAccessToken, signRefreshToken }
}

describe('OrganizationController.create', () => {
  beforeEach(() => {
    // nothing; each test uses local mocks
  })

  test('success: signs new access token with role=manager, sets auth_token cookie, returns redirectTo', async () => {
    const { controller, createOrgExecute, signAccessToken, signRefreshToken } = makeController()
    const { ctx, cookies, jsonCalls } = createMockContext({
      userId: 'u-1',
      email: 'member@example.com',
      role: 'member',
      permissions: [],
      tokenType: 'access',
    })
    ctx.set('validated', { name: 'Acme' })

    const response = await controller.create(ctx)

    // Application service called
    expect(createOrgExecute).toHaveBeenCalledTimes(1)

    // JWT signing: role must be 'manager' (not old 'member')
    expect(signAccessToken).toHaveBeenCalledTimes(1)
    const signCall = signAccessToken.mock.calls[0]?.[0] as TokenSignPayload | undefined
    expect(signCall?.userId).toBe('u-1')
    expect(signCall?.email).toBe('member@example.com')
    expect(signCall?.role).toBe('manager')
    expect(signCall?.permissions).toEqual([])

    // refresh_token NOT rotated
    expect(signRefreshToken).not.toHaveBeenCalled()

    // Cookie: auth_token only, with correct options
    expect(cookies.length).toBe(1)
    const authCookie = cookies[0]!
    expect(authCookie.name).toBe('auth_token')
    expect(authCookie.value).toBe('new-access-token-abc')
    expect(authCookie.options.httpOnly).toBe(true)
    expect(authCookie.options.sameSite).toBe('Lax')
    expect(authCookie.options.path).toBe('/')
    expect(authCookie.options.maxAge).toBe(900)

    // Response shape
    expect(response.status).toBe(201)
    expect(jsonCalls.length).toBe(1)
    const body = jsonCalls[0]!.body as {
      success: boolean
      data?: { redirectTo?: string; id?: string }
    }
    expect(body.success).toBe(true)
    expect(body.data?.redirectTo).toBe('/manager/dashboard')
    expect(body.data?.id).toBe('org-1')
  })

  test('failure (NAME_REQUIRED): does NOT sign token, NOT setCookie, no redirectTo, returns 400', async () => {
    const createOrgExecute = mock(async () => ({
      success: false,
      message: 'Organization name is required',
      error: 'NAME_REQUIRED',
    }))
    const { controller, signAccessToken, signRefreshToken } = makeController({ createOrgExecute })
    const { ctx, cookies, jsonCalls } = createMockContext({
      userId: 'u-1',
      email: 'member@example.com',
      role: 'member',
      permissions: [],
      tokenType: 'access',
    })
    ctx.set('validated', { name: '' })

    const response = await controller.create(ctx)

    expect(signAccessToken).not.toHaveBeenCalled()
    expect(signRefreshToken).not.toHaveBeenCalled()
    expect(cookies.length).toBe(0)
    expect(response.status).toBe(400)
    const body = jsonCalls[0]!.body as { success: boolean; error?: string; data?: unknown }
    expect(body.success).toBe(false)
    expect(body.error).toBe('NAME_REQUIRED')
    // No redirectTo on failure
    expect(
      (body.data as { redirectTo?: string } | undefined)?.redirectTo,
    ).toBeUndefined()
  })

  test('failure (ALREADY_HAS_ORGANIZATION): skips token + cookie, returns 400', async () => {
    const createOrgExecute = mock(async () => ({
      success: false,
      message: 'User already has an organization',
      error: 'ALREADY_HAS_ORGANIZATION',
    }))
    const { controller, signAccessToken } = makeController({ createOrgExecute })
    const { ctx, cookies, jsonCalls } = createMockContext({
      userId: 'u-1',
      email: 'member@example.com',
      role: 'member',
      permissions: [],
      tokenType: 'access',
    })
    ctx.set('validated', { name: 'Acme' })

    const response = await controller.create(ctx)

    expect(signAccessToken).not.toHaveBeenCalled()
    expect(cookies.length).toBe(0)
    expect(response.status).toBe(400)
    const body = jsonCalls[0]!.body as { error?: string }
    expect(body.error).toBe('ALREADY_HAS_ORGANIZATION')
  })

  test('unauthorized: no auth context → 401, no service call, no token, no cookie', async () => {
    const { controller, createOrgExecute, signAccessToken } = makeController()
    const { ctx, cookies, jsonCalls } = createMockContext(/* no auth */)

    const response = await controller.create(ctx)

    expect(createOrgExecute).not.toHaveBeenCalled()
    expect(signAccessToken).not.toHaveBeenCalled()
    expect(cookies.length).toBe(0)
    expect(response.status).toBe(401)
    const body = jsonCalls[0]!.body as { success: boolean; error?: string }
    expect(body.success).toBe(false)
    expect(body.error).toBe('UNAUTHORIZED')
  })
})
