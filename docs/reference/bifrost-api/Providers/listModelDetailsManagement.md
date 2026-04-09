# List model details

Lists available models with capability metadata, when available from the model catalog, with optional filtering by query, provider, or keys.


## HTTP Request

`GET /api/models/details`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| query | query | string | Filter models by name (case-insensitive partial match) |
| provider | query | string | Filter by specific provider name |
| keys | query | array | Comma-separated list of key IDs to filter models accessible by those keys |
| limit | query | integer | Maximum number of results to return (default 20) |
| unfiltered | query | boolean | If true, return all models including those filtered out by provider-level restrictions |

### Responses

#### 200
Successful response

#### 500
Internal server error

