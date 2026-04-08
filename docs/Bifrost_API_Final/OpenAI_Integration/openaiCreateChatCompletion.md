# Create chat completion (OpenAI format)

Creates a chat completion using OpenAI-compatible format.
Supports streaming via SSE.

**Async inference:** Send `x-bf-async: true` to submit the request as a background job and receive a job ID immediately. Poll with `x-bf-async-id: <job-id>` to retrieve the result. When the job is still processing, the response will have an empty `choices` array. When completed, `choices` will contain the full result. See [Async Inference](/features/async-inference) for details.

**Note:** This endpoint also works without the `/v1` prefix (e.g., `/openai/chat/completions`).


## HTTP Request

`POST /openai/v1/chat/completions`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| x-bf-async | header | string | Set to `true` to submit this request as an async job. Returns immediately with a job ID. Not compatible with streaming. |
| x-bf-async-id | header | string | Poll for results of a previously submitted async job by providing the job ID returned from the initial async request. |
| x-bf-async-job-result-ttl | header | integer | Override the default result TTL in seconds. Results expire after this duration from completion time. |

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

