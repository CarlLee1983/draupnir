# Create a new plugin

Creates a new plugin with the specified configuration.

## HTTP Request

`POST /api/plugins`

### Request Body

```yaml
Object
  - `name` (string)
  - `enabled` (boolean)
  - `config` (object)
  - `path` (string)
```

### Responses

#### 201
Plugin created successfully

#### 400
Bad request

#### 409
Plugin already exists

#### 500
Internal server error

