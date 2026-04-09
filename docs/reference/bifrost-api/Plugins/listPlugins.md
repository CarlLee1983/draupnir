# List all plugins

Returns a list of all plugins with their configurations and status.
The `actualName` field contains the plugin name from `GetName()` (used as the map key),
while `name` contains the display name from the configuration.
The `types` array in the status shows which interfaces the plugin implements (llm, mcp, http).


## HTTP Request

`GET /api/plugins`

### Responses

#### 200
Successful response

#### 500
Internal server error

