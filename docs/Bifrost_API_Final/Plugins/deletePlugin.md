# Delete a plugin

Removes a plugin from the configuration and stops it if running.

## HTTP Request

`DELETE /api/plugins/{name}`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| name | path | string | Plugin display name (the config field `name`, not the internal `actualName` from GetName()) |

### Responses

#### 200
Plugin deleted successfully

#### 400
Bad request

#### 404
Plugin not found

#### 500
Internal server error

