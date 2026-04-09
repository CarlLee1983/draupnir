# Update routing rule

Updates an existing routing rule's configuration.

## HTTP Request

`PUT /api/governance/routing-rules/{rule_id}`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| rule_id | path | string | Routing rule ID |

### Request Body

```yaml
Object
  - `name` (string)
  - `description` (string)
  - `enabled` (boolean)
  - `cel_expression` (string)
  - `targets` (array) - Replaces all existing targets when provided; weights must sum to 1
  - `fallbacks` (array)
  - `priority` (integer)
  - `query` (object)
```

### Responses

#### 200
Routing rule updated successfully

#### 400
Bad request

#### 404
Routing rule not found

#### 500
Internal server error

