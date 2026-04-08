# Delete a provider

Removes a provider from the configuration.

## HTTP Request

`DELETE /api/providers/{provider}`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| provider | path | string | Provider name |

### Responses

#### 200
Provider deleted successfully

#### 400
Bad request

#### 404
Provider not found

#### 500
Internal server error

