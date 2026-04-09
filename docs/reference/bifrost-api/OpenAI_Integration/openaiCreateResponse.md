# Create response (OpenAI Responses API)

Creates a response using OpenAI Responses API format.
Supports streaming via SSE.

**Async inference:** Send `x-bf-async: true` to submit the request as a background job and receive a job ID immediately. Poll with `x-bf-async-id: <job-id>` to retrieve the result. When the job is still processing, the response `status` will not be `completed`. When completed, the full response with `output_text` will be returned. See [Async Inference](/features/async-inference) for details.

**Note:** This endpoint also works without the `/v1` prefix (e.g., `/openai/responses`).


## HTTP Request

`POST /openai/v1/responses`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| x-bf-async | header | string | Set to `true` to submit this request as an async job. Returns immediately with a job ID. Not compatible with streaming. |
| x-bf-async-id | header | string | Poll for results of a previously submitted async job by providing the job ID returned from the initial async request. |
| x-bf-async-job-result-ttl | header | integer | Override the default result TTL in seconds. Results expire after this duration from completion time. |

### Request Body

```yaml
Object
  - `model` (string) - Model identifier
  - `input` (any) - Input - can be a string or array of messages
  - `stream` (boolean)
  - `instructions` (string) - System instructions for the model
  - `max_output_tokens` (integer)
  - `metadata` (object)
  - `parallel_tool_calls` (boolean)
  - `previous_response_id` (string)
  - `reasoning` (object)
  - `store` (boolean)
  - `temperature` (number)
  - `text` (object)
  - `tool_choice` (any)
  - `tools` (array)
  - `top_p` (number)
  - `truncation` (string)
  - `user` (string)
  - `fallbacks` (array)
```

### Responses

#### 200
Successful response

#### 400
Bad request

#### 500
Internal server error

