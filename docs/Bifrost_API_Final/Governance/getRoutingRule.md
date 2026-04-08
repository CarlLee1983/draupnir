# Get routing rule

Returns a specific routing rule by ID.

## HTTP Request

`GET /api/governance/routing-rules/{rule_id}`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| rule_id | path | string | Routing rule ID |

### Responses

#### 200
Successful response

#### 404
Routing rule not found

#### 500
Internal server error

