# List virtual keys

Returns a list of all virtual keys with their configurations.

## HTTP Request

`GET /api/governance/virtual-keys`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| from_memory | query | boolean | If true, returns virtual keys from in-memory cache instead of database |

### Responses

#### 200
Successful response

#### 500
Internal server error

