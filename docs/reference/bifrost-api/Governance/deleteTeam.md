# Delete team

Deletes a team.

## HTTP Request

`DELETE /api/governance/teams/{team_id}`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| team_id | path | string | Team ID |

### Responses

#### 200
Team deleted successfully

#### 404
Team not found

#### 500
Internal server error

