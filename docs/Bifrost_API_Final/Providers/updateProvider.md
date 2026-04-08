# Update a provider

Updates a provider's configuration. Expects ALL fields to be provided,
including both edited and non-edited fields. Partial updates are not supported.


## HTTP Request

`PUT /api/providers/{provider}`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| provider | path | string | Provider name |

### Request Body

```yaml
Object
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
Provider updated successfully

#### 400
Bad request

#### 500
Internal server error

