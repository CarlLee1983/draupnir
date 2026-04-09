# Update proxy configuration

Updates the global proxy configuration.

## HTTP Request

`PUT /api/proxy-config`

### Request Body

```yaml
Object
  - `enabled` (boolean)
  - `type` (string)
  - `url` (string)
  - `username` (string)
  - `password` (string) - Password (redacted as <redacted> in responses)
  - `no_proxy` (string)
  - `timeout` (integer)
  - `skip_tls_verify` (boolean)
  - `enable_for_scim` (boolean)
  - `enable_for_inference` (boolean)
  - `enable_for_api` (boolean)
```

### Responses

#### 200
Proxy configuration updated successfully

#### 400
Bad request

#### 500
Internal server error

