# Delete routing rule

Deletes a routing rule.

## HTTP Request

`DELETE /api/governance/routing-rules/{rule_id}`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| rule_id | path | string | Routing rule ID |

### Responses

#### 200
Routing rule deleted successfully

#### 404
Routing rule not found

#### 500
Internal server error

