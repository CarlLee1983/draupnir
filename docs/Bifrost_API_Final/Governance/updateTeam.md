# Update team

Updates an existing team.

## HTTP Request

`PUT /api/governance/teams/{team_id}`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| team_id | path | string | Team ID |

### Request Body

```yaml
Object
  - `name` (string)
  - `customer_id` (string)
  - `budget` (object) - Update budget request
```

### Responses

#### 200
Team updated successfully

#### 400
Bad request

#### 404
Team not found

#### 500
Internal server error

