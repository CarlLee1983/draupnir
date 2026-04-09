# Revoke OAuth config

Revokes an OAuth configuration and its associated access token.
After revocation, the MCP client will no longer be able to use this OAuth token.


## HTTP Request

`DELETE /api/oauth/config/{id}/status`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| id | path | string | OAuth config ID |

### Responses

#### 200
OAuth token revoked successfully

#### 500
Internal server error

