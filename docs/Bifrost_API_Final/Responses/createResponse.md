# Create a response

Creates a response using the OpenAI Responses API format. Supports streaming via SSE.


## HTTP Request

`POST /v1/responses`

### Request Body

```yaml
Object
  - `model` (string) - Model in provider/model format
  - `input` (any) - Input - can be a string or array of messages
  - `fallbacks` (array)
  - `stream` (boolean)
  - `background` (boolean)
  - `conversation` (string)
  - `include` (array)
  - `instructions` (string)
  - `max_output_tokens` (integer)
  - `max_tool_calls` (integer)
  - `metadata` (object)
  - `parallel_tool_calls` (boolean)
  - `previous_response_id` (string)
  - `prompt_cache_key` (string)
  - `reasoning` (object)
  - `safety_identifier` (string)
  - `service_tier` (string)
  - `stream_options` (object)
  - `store` (boolean)
  - `temperature` (number)
  - `text` (object)
  - `top_logprobs` (integer)
  - `top_p` (number)
  - `tool_choice` (any)
  - `tools` (array)
  - `truncation` (string)
```

### Responses

#### 200
Successful response

#### 400
Bad request

#### 500
Internal server error

