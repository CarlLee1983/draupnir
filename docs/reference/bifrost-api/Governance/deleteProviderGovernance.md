# Delete provider governance

Removes governance settings (budget and rate limits) for a specific provider.

## HTTP Request

`DELETE /api/governance/providers/{provider_name}`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| provider_name | path | string | Provider name |

### Responses

#### 200
Provider governance deleted successfully

#### 404
Provider not found

#### 500
Internal server error

