# Get a specific plugin

Returns the configuration for a specific plugin.
The response includes the plugin status with types array showing which interfaces
the plugin implements (llm, mcp, http). The `actualName` field shows the plugin name
from GetName() (used as the map key), which may differ from the display name (`name`).


## HTTP Request

`GET /api/plugins/{name}`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| name | path | string | Plugin display name (the config field `name`, not the internal `actualName` from GetName()) |

### Responses

#### 200
Successful response

#### 400
Bad request

#### 404
Plugin not found

#### 500
Internal server error

