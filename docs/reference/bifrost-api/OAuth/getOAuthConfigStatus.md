# Get OAuth config status

Retrieves the current status of an OAuth configuration.
Shows whether the OAuth flow is pending, authorized, or failed,
and includes token expiration and scopes if authorized.


## HTTP Request

`GET /api/oauth/config/{id}/status`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| id | path | string | OAuth config ID |

### Responses

#### 200
OAuth config status retrieved successfully

#### 404
OAuth config not found

#### 500
Internal server error

