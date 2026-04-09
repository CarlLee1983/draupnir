# Add a new provider

Adds a new provider with the specified configuration.

## HTTP Request

`POST /api/providers`

### Request Body

```yaml
Object
  - `provider` (string) - AI model provider identifier
  - `network_config` (object) - Network configuration for provider connections
  - `concurrency_and_buffer_size` (object) - Concurrency settings
  - `proxy_config` (object) - Proxy configuration
  - `send_back_raw_request` (boolean)
  - `send_back_raw_response` (boolean)
  - `store_raw_request_response` (boolean)
  - `custom_provider_config` (object) - Custom provider configuration
```

### Responses

#### 200
Provider added successfully

#### 400
Bad request

#### 409
Provider already exists

#### 500
Internal server error

