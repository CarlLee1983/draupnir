# Edit MCP client

Updates an existing MCP client's configuration.
Unlike client creation, tool_pricing can be included to set per-tool execution costs since tools are already fetched.
Optionally provide vk_configs to manage which virtual keys have access to this MCP server and with which tools. When provided, this fully replaces all existing VK assignments in a single atomic transaction.


## HTTP Request

`PUT /api/mcp/client/{id}`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| id | path | string | MCP client ID |

### Request Body

```yaml
Object
  - `client_id` (string) - Unique identifier for the MCP client
  - `name` (string) - Display name for the MCP client
  - `is_code_mode_client` (boolean) - Whether this client is available in code mode
  - `connection_type` (string) - Connection type for MCP client
  - `connection_string` (string) - HTTP or SSE URL (required for HTTP or SSE connections)
  - `stdio_config` (object) - STDIO configuration for MCP client
  - `auth_type` (string) - Authentication type for the MCP connection
  - `oauth_config_id` (string) - OAuth config ID for OAuth authentication.
  - `headers` (object) - Custom headers to include in requests.
  - `tools_to_execute` (array) - Include-only list for tools.
  - `tools_to_auto_execute` (array) - List of tools that can be auto-executed without user approval.
  - `tool_pricing` (object) - Per-tool cost in USD for execution.
  - `allow_on_all_virtual_keys` (boolean) - When true, this MCP client's tools are accessible to all virtual keys without requiring
  - `vk_configs` (array) - When provided, replaces all virtual key assignments for this MCP client.
```

### Responses

#### 200
MCP client updated successfully

#### 400
Bad request

#### 500
Internal server error

