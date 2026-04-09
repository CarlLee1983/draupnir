# Create message (Anthropic format)

Creates a message using Anthropic Messages API format.
Supports streaming via SSE.

**Async inference:** Send `x-bf-async: true` to submit the request as a background job and receive a job ID immediately. Poll with `x-bf-async-id: <job-id>` to retrieve the result. When the job is still processing, the response will have an empty `content` array. When completed, `content` will contain the full result. See [Async Inference](/features/async-inference) for details.


## HTTP Request

`POST /anthropic/v1/messages`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| x-bf-async | header | string | Set to `true` to submit this request as an async job. Returns immediately with a job ID. Not compatible with streaming. |
| x-bf-async-id | header | string | Poll for results of a previously submitted async job by providing the job ID returned from the initial async request. |
| x-bf-async-job-result-ttl | header | integer | Override the default result TTL in seconds. Results expire after this duration from completion time. |

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

