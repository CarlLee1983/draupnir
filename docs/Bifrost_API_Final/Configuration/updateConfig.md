# Update configuration

Updates the Bifrost configuration. Supports hot-reloading of certain settings
like drop_excess_requests. Some settings may require a restart to take effect.


## HTTP Request

`PUT /api/config`

### Request Body

```yaml
Object
  - `client_config` (object) - Client configuration
  - `framework_config` (object) - Framework configuration
  - `auth_config` (object) - Authentication configuration
```

### Responses

#### 200
Configuration updated successfully

#### 400
Bad request

#### 500
Internal server error

