interface ApiEndpoint {
  method: string
  path: string
  description: string
}

interface GetApiDocsResponse {
  success: boolean
  message: string
  data?: {
    openApiUrl: string
    version: string
    endpoints: ApiEndpoint[]
  }
}

export class GetApiDocsService {
  async execute(): Promise<GetApiDocsResponse> {
    const endpoints: ApiEndpoint[] = [
      { method: 'POST', path: '/api/dev-portal/apps', description: 'Register a new Application' },
      {
        method: 'GET',
        path: '/api/dev-portal/apps',
        description: 'List all Applications in the organization',
      },
      {
        method: 'PATCH',
        path: '/api/dev-portal/apps/:appId',
        description: 'Update Application information',
      },
      {
        method: 'POST',
        path: '/api/dev-portal/apps/:appId/keys',
        description: 'Issue App API Key',
      },
      {
        method: 'GET',
        path: '/api/dev-portal/apps/:appId/keys',
        description: 'List Keys for Application',
      },
      {
        method: 'POST',
        path: '/api/dev-portal/apps/:appId/keys/:keyId/revoke',
        description: 'Revoke App API Key',
      },
      {
        method: 'PUT',
        path: '/api/dev-portal/apps/:appId/webhook',
        description: 'Configure Webhook',
      },
      {
        method: 'DELETE',
        path: '/api/dev-portal/apps/:appId/webhook',
        description: 'Remove Webhook configuration',
      },
      { method: 'GET', path: '/api/dev-portal/docs', description: 'Get API documentation' },
    ]

    return {
      success: true,
      message: 'API documentation retrieved successfully',
      data: {
        openApiUrl: '/api/docs/openapi.json',
        version: '1.0.0',
        endpoints,
      },
    }
  }
}
