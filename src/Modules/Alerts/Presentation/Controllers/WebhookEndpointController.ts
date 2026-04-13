import type { CurrentOrganizationContext } from '@/Modules/Organization/Presentation/Middleware/OrganizationMiddleware'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { toCreatedDTO, toListDTO } from '../../Application/DTOs/WebhookEndpointDTO'
import type { DeleteWebhookEndpointService } from '../../Application/Services/DeleteWebhookEndpointService'
import type { ListWebhookEndpointsService } from '../../Application/Services/ListWebhookEndpointsService'
import type { RegisterWebhookEndpointService } from '../../Application/Services/RegisterWebhookEndpointService'
import type { RotateWebhookSecretService } from '../../Application/Services/RotateWebhookSecretService'
import type { TestWebhookEndpointService } from '../../Application/Services/TestWebhookEndpointService'
import type { UpdateWebhookEndpointService } from '../../Application/Services/UpdateWebhookEndpointService'
import type { RegisterWebhookEndpointInput } from '../Requests/RegisterWebhookEndpointRequest'
import type { UpdateWebhookEndpointInput } from '../Requests/UpdateWebhookEndpointRequest'

type WebhookEndpointControllerDeps = {
  listWebhookEndpointsService: ListWebhookEndpointsService
  registerWebhookEndpointService: RegisterWebhookEndpointService
  updateWebhookEndpointService: UpdateWebhookEndpointService
  rotateWebhookSecretService: RotateWebhookSecretService
  deleteWebhookEndpointService: DeleteWebhookEndpointService
  testWebhookEndpointService: TestWebhookEndpointService
}

function resolveOrgId(ctx: IHttpContext): string | null {
  const currentOrg = ctx.get<CurrentOrganizationContext>('currentOrg')
  return currentOrg?.organizationId ?? ctx.getParam('orgId') ?? null
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error'
}

export class WebhookEndpointController {
  constructor(private readonly deps: WebhookEndpointControllerDeps) {}

  async list(ctx: IHttpContext): Promise<Response> {
    const orgId = resolveOrgId(ctx)
    if (!orgId) {
      return ctx.json({ success: false, message: 'Missing organization ID', data: [] }, 400)
    }

    const endpoints = await this.deps.listWebhookEndpointsService.list(orgId)
    return ctx.json({ success: true, data: endpoints.map(toListDTO) }, 200)
  }

  async create(ctx: IHttpContext): Promise<Response> {
    const orgId = resolveOrgId(ctx)
    if (!orgId) {
      return ctx.json({ success: false, message: 'Missing organization ID' }, 400)
    }

    const body = ctx.get('validated') as RegisterWebhookEndpointInput
    try {
      const result = await this.deps.registerWebhookEndpointService.register(
        orgId,
        body.url,
        body.description ?? null,
      )
      return ctx.json(
        { success: true, data: toCreatedDTO(result.endpoint, result.plaintextSecret) },
        201,
      )
    } catch (error) {
      return ctx.json({ success: false, message: toErrorMessage(error) }, 422)
    }
  }

  async update(ctx: IHttpContext): Promise<Response> {
    const orgId = resolveOrgId(ctx)
    const endpointId = ctx.getParam('endpointId')
    if (!orgId) {
      return ctx.json({ success: false, message: 'Missing organization ID' }, 400)
    }
    if (!endpointId) {
      return ctx.json({ success: false, message: 'Missing endpoint ID' }, 400)
    }

    const body = ctx.get('validated') as UpdateWebhookEndpointInput
    try {
      const endpoint = await this.deps.updateWebhookEndpointService.update(orgId, endpointId, body)
      return ctx.json({ success: true, data: toListDTO(endpoint) }, 200)
    } catch (error) {
      return ctx.json({ success: false, message: toErrorMessage(error) }, 422)
    }
  }

  async rotateSecret(ctx: IHttpContext): Promise<Response> {
    const orgId = resolveOrgId(ctx)
    const endpointId = ctx.getParam('endpointId')
    if (!orgId) {
      return ctx.json({ success: false, message: 'Missing organization ID' }, 400)
    }
    if (!endpointId) {
      return ctx.json({ success: false, message: 'Missing endpoint ID' }, 400)
    }

    try {
      const result = await this.deps.rotateWebhookSecretService.rotate(orgId, endpointId)
      return ctx.json(
        { success: true, data: toCreatedDTO(result.endpoint, result.plaintextSecret) },
        200,
      )
    } catch (error) {
      return ctx.json({ success: false, message: toErrorMessage(error) }, 422)
    }
  }

  async test(ctx: IHttpContext): Promise<Response> {
    const orgId = resolveOrgId(ctx)
    const endpointId = ctx.getParam('endpointId')
    if (!orgId) {
      return ctx.json({ success: false, message: 'Missing organization ID' }, 400)
    }
    if (!endpointId) {
      return ctx.json({ success: false, message: 'Missing endpoint ID' }, 400)
    }

    try {
      const result = await this.deps.testWebhookEndpointService.test(orgId, endpointId)
      return ctx.json(
        {
          success: result.success,
          data: {
            statusCode: result.statusCode ?? null,
            attempts: result.attempts,
            error: result.error ?? null,
          },
        },
        200,
      )
    } catch (error) {
      return ctx.json({ success: false, message: toErrorMessage(error) }, 422)
    }
  }

  async delete(ctx: IHttpContext): Promise<Response> {
    const orgId = resolveOrgId(ctx)
    const endpointId = ctx.getParam('endpointId')
    if (!orgId) {
      return ctx.json({ success: false, message: 'Missing organization ID' }, 400)
    }
    if (!endpointId) {
      return ctx.json({ success: false, message: 'Missing endpoint ID' }, 400)
    }

    await this.deps.deleteWebhookEndpointService.delete(orgId, endpointId)
    return new Response(null, { status: 204 })
  }
}
