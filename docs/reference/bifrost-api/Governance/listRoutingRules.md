# List routing rules

Returns a list of all routing rules configured for intelligent request routing across providers.

## HTTP Request

`GET /api/governance/routing-rules`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| scope | query | string | Filter routing rules by scope (global, team, customer, virtual_key) |
| scope_id | query | string | Filter routing rules by scope ID |

### Responses

#### 200
Successful response

#### 500
Internal server error

