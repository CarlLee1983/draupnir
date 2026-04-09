# Get team

Returns a specific team by ID.

## HTTP Request

`GET /api/governance/teams/{team_id}`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| team_id | path | string | Team ID |
| from_memory | query | boolean | If true, returns team from in-memory cache instead of database |

### Responses

#### 200
Successful response

#### 404
Team not found

#### 500
Internal server error

