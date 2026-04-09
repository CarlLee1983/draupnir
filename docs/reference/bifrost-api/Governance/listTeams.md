# List teams

Returns a list of all teams.

## HTTP Request

`GET /api/governance/teams`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| customer_id | query | string | Filter teams by customer ID |
| from_memory | query | boolean | If true, returns teams from in-memory cache instead of database |

### Responses

#### 200
Successful response

#### 500
Internal server error

