# Clear cache by request ID

Clears cache entries associated with a specific request ID.

## HTTP Request

`DELETE /api/cache/clear/{requestId}`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| requestId | path | string | Request ID to clear cache for |

### Responses

#### 200
Cache cleared successfully

#### 400
Bad request

#### 500
Internal server error

