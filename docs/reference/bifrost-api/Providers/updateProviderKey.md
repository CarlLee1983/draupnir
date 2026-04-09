# Update a key for a provider

Updates an existing key. Send the full key object. Redacted values sent back
unchanged are automatically preserved (the server merges them with the stored
raw values).


## HTTP Request

`PUT /api/providers/{provider}/keys/{key_id}`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| provider | path | string | Provider name |
| key_id | path | string | Key ID |

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
Key updated successfully

#### 400
Bad request

#### 404
Provider or key not found

#### 500
Internal server error

