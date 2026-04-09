# Create async chat completion

Submits a chat completion request for asynchronous execution. Returns a job ID immediately
with HTTP 202. Poll the corresponding GET endpoint with the job ID to retrieve the result.
Streaming is not supported for async requests.


## HTTP Request

`POST /v1/async/chat/completions`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| x-bf-async-job-result-ttl | header | integer | Time-to-live in seconds for the job result after completion. Defaults to 3600 (1 hour). After expiry, the job result is automatically cleaned up.  |

### Request Body

```yaml
Object
  - `model` (string) - Model in provider/model format (e.g., openai/gpt-4)
  - `messages` (array) - List of messages in the conversation
  - `fallbacks` (array) - Fallback models in provider/model format
  - `stream` (boolean) - Whether to stream the response
  - `frequency_penalty` (number)
  - `logit_bias` (object)
  - `logprobs` (boolean)
  - `max_completion_tokens` (integer)
  - `metadata` (object)
  - `modalities` (array)
  - `parallel_tool_calls` (boolean)
  - `presence_penalty` (number)
  - `prompt_cache_key` (string)
  - `reasoning` (object)
  - `response_format` (object) - Format for the response
  - `safety_identifier` (string)
  - `service_tier` (string)
  - `stream_options` (object)
  - `store` (boolean)
  - `temperature` (number)
  - `tool_choice` (any)
  - `tools` (array)
  - `seed` (integer) - Deterministic sampling seed
  - `top_p` (number) - Nucleus sampling parameter
  - `top_logprobs` (integer) - Number of most likely tokens to return at each position
  - `stop` (any) - Up to 4 sequences where the API will stop generating tokens
  - `prediction` (object) - Predicted output content for the model to reference (OpenAI only). Can reduce latency.
  - `prompt_cache_retention` (string) - Prompt cache retention policy
  - `web_search_options` (object) - Web search options for chat completions (OpenAI only)
  - `truncation` (string)
  - `user` (string)
  - `verbosity` (string)
```

### Responses

#### 202
Job accepted for processing

#### 400
Bad request

#### 500
Internal server error

