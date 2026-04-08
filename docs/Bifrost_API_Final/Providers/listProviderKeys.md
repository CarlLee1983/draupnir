# List keys for a provider

Returns all keys configured for a specific provider.

## HTTP Request

`GET /api/providers/{provider}/keys`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| provider | path | string | Provider name |

### Responses

#### 200
Successful response

#### 400
Bad request

#### 404
Provider not found

#### 500
Internal server error

