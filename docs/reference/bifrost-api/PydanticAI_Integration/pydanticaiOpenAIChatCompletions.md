# Chat completions (PydanticAI - OpenAI format)

Creates a chat completion using OpenAI-compatible format via PydanticAI.


## HTTP Request

`POST /pydanticai/v1/chat/completions`

### Request Body

```yaml
Object
  - `model` (string) - Model identifier (e.g., gpt-4, gpt-3.5-turbo)
  - `messages` (array) - List of messages in the conversation
  - `stream` (boolean) - Whether to stream the response
  - `max_tokens` (integer) - Maximum tokens to generate (legacy, use max_completion_tokens)
  - `max_completion_tokens` (integer) - Maximum tokens to generate
  - `temperature` (number)
  - `top_p` (number)
  - `frequency_penalty` (number)
  - `presence_penalty` (number)
  - `logit_bias` (object)
  - `logprobs` (boolean)
  - `top_logprobs` (integer)
  - `n` (integer)
  - `stop` (any)
  - `seed` (integer)
  - `user` (string)
  - `tools` (array)
  - `tool_choice` (any)
  - `parallel_tool_calls` (boolean)
  - `response_format` (object) - Format for the response
  - `reasoning_effort` (string) - OpenAI reasoning effort level
  - `service_tier` (string)
  - `stream_options` (object)
  - `fallbacks` (array) - Fallback models
```

### Responses

#### 200
Successful response

#### 400
Bad request

#### 500
Internal server error

