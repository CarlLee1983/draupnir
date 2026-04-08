# Get a specific key for a provider

Returns a single key for the specified provider.

## HTTP Request

`GET /api/providers/{provider}/keys/{key_id}`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| provider | path | string | Provider name |
| key_id | path | string | Key ID |

### Responses

#### 200
Successful response

#### 400
Bad request

#### 404
Provider or key not found

#### 500
Internal server error

