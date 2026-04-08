# Create message (LiteLLM - Anthropic format)

Creates a message using Anthropic-compatible format via LiteLLM.


## HTTP Request

`POST /litellm/anthropic/v1/messages`

### Request Body

```yaml
Object
  - `model` (string) - Model identifier (e.g., claude-3-opus-20240229)
  - `max_tokens` (integer) - Maximum tokens to generate
  - `messages` (array) - List of messages in the conversation
  - `system` (any) - System prompt
  - `cache_control` (object) - Automatic caching directives for the whole request
  - `metadata` (object)
  - `stream` (boolean) - Whether to stream the response
  - `temperature` (number)
  - `top_p` (number)
  - `top_k` (integer)
  - `stop_sequences` (array)
  - `tools` (array)
  - `tool_choice` (any)
  - `mcp_servers` (array) - MCP servers configuration (requires beta header)
  - `thinking` (object)
  - `output_format` (object) - Structured output format (requires beta header)
  - `fallbacks` (array)
```

### Responses

#### 200
Successful response

#### 400
Bad request

#### 500
Internal server error

