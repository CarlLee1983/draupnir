# Create async response

Submits a response request for asynchronous execution. Returns a job ID immediately
with HTTP 202. Poll the corresponding GET endpoint with the job ID to retrieve the result.
Streaming is not supported for async requests.


## HTTP Request

`POST /v1/async/responses`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| x-bf-async-job-result-ttl | header | integer | Time-to-live in seconds for the job result after completion. Defaults to 3600 (1 hour). After expiry, the job result is automatically cleaned up.  |

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

#### 202
Job accepted for processing

#### 400
Bad request

#### 500
Internal server error

