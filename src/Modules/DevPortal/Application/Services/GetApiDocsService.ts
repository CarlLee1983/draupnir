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
      { method: 'POST', path: '/api/dev-portal/apps', description: '註冊新的 Application' },
      { method: 'GET', path: '/api/dev-portal/apps', description: '列出組織下的所有 Applications' },
      {
        method: 'PATCH',
        path: '/api/dev-portal/apps/:appId',
        description: '更新 Application 資訊',
      },
      { method: 'POST', path: '/api/dev-portal/apps/:appId/keys', description: '配發 App API Key' },
      {
        method: 'GET',
        path: '/api/dev-portal/apps/:appId/keys',
        description: '列出 Application 的 Keys',
      },
      {
        method: 'POST',
        path: '/api/dev-portal/apps/:appId/keys/:keyId/revoke',
        description: '撤銷 App API Key',
      },
      { method: 'PUT', path: '/api/dev-portal/apps/:appId/webhook', description: '設定 Webhook' },
      {
        method: 'DELETE',
        path: '/api/dev-portal/apps/:appId/webhook',
        description: '清除 Webhook 設定',
      },
      { method: 'GET', path: '/api/dev-portal/docs', description: '取得 API 文件' },
    ]

    return {
      success: true,
      message: 'API 文件取得成功',
      data: {
        openApiUrl: '/api/docs/openapi.json',
        version: '1.0.0',
        endpoints,
      },
    }
  }
}
