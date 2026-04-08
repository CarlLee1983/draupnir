# Update a plugin

Updates a plugin's configuration. Will reload or stop the plugin based on enabled status.
The response `actualName` field shows the plugin name from GetName() (used as the map key),
which may differ from the display name (`name`).


## HTTP Request

`PUT /api/plugins/{name}`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| name | path | string | Plugin display name (the config field `name`, not the internal `actualName` from GetName()) |

### Request Body

```yaml
Object
  - `enabled` (boolean)
  - `config` (object)
  - `path` (string)
```

### Responses

#### 200
Plugin updated successfully

#### 400
Bad request

#### 404
Plugin not found

#### 500
Internal server error

