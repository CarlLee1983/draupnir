# List rate limits

Returns a list of all rate limits. Use the `from_memory` query parameter to get data from in-memory cache.

## HTTP Request

`GET /api/governance/rate-limits`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| from_memory | query | boolean | If true, returns rate limits from in-memory cache instead of database |

### Responses

#### 200
Successful response

#### 500
Internal server error

