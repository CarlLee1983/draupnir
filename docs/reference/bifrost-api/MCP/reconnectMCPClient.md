# Reconnect MCP client

Reconnects an MCP client that is in an error or disconnected state.

## HTTP Request

`POST /api/mcp/client/{id}/reconnect`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| id | path | string | MCP client ID |

### Responses

#### 200
MCP client reconnected successfully

#### 400
Bad request

#### 500
Internal server error

