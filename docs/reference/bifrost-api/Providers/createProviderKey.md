# Create a key for a provider

Creates a new API key for the specified provider. The key `id` is auto-generated
if omitted. `enabled` defaults to `true` if omitted. `value` is required and must
not be empty. Keys cannot be created on keyless providers.


## HTTP Request

`POST /api/providers/{provider}/keys`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| provider | path | string | Provider name |

### Request Body

```yaml
Object
  - `id` (string) - Unique identifier for the key
  - `name` (string) - Name of the key
  - `value` (object) - API key value (redacted in responses)
  - `models` (array) - List of models this key can access (whitelist)
  - `blacklisted_models` (array) - List of models this key cannot access (blacklist)
  - `weight` (number) - Weight for load balancing
  - `azure_key_config` (object) - Azure-specific key configuration
  - `vertex_key_config` (object) - Vertex-specific key configuration
  - `bedrock_key_config` (object) - AWS Bedrock-specific key configuration
  - `replicate_key_config` (object) - Replicate-specific key configuration
  - `vllm_key_config` (object) - VLLM-specific key configuration
  - `ollama_key_config` (object) - Ollama-specific key configuration
  - `sgl_key_config` (object) - SGLang-specific key configuration
  - `enabled` (boolean) - Whether the key is active (defaults to true)
  - `use_for_batch_api` (boolean) - Whether this key can be used for batch API operations
  - `config_hash` (string) - Hash of config.json version, used for change detection
  - `status` (string) - Status of key (e.g., success, list_models_failed)
  - `description` (string) - Error or status description for the key
```

### Responses

#### 200
Key created successfully

#### 400
Bad request

#### 404
Provider not found

#### 409
Key ID already exists

#### 500
Internal server error

