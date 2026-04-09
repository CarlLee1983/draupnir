# Remove MCP client

Removes an MCP client from the configuration.

## HTTP Request

`DELETE /api/mcp/client/{id}`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| id | path | string | MCP client ID |

### Responses

#### 200
MCP client removed successfully

#### 400
Bad request

#### 500
Internal server error

