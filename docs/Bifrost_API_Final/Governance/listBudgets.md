# List budgets

Returns a list of all budgets. Use the `from_memory` query parameter to get data from in-memory cache.

## HTTP Request

`GET /api/governance/budgets`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| from_memory | query | boolean | If true, returns budgets from in-memory cache instead of database |

### Responses

#### 200
Successful response

#### 500
Internal server error

