# Create async text completion

Submits a text completion request for asynchronous execution. Returns a job ID immediately
with HTTP 202. Poll the corresponding GET endpoint with the job ID to retrieve the result.
Streaming is not supported for async requests.


## HTTP Request

`POST /v1/async/completions`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| x-bf-async-job-result-ttl | header | integer | Time-to-live in seconds for the job result after completion. Defaults to 3600 (1 hour). After expiry, the job result is automatically cleaned up.  |

### Request Body

```yaml
Object
  - `model` (string) - Model in provider/model format
  - `prompt` (any) - Prompt input - can be a string or array of strings
  - `fallbacks` (array)
  - `stream` (boolean)
  - `best_of` (integer)
  - `echo` (boolean)
  - `frequency_penalty` (number)
  - `logit_bias` (object)
  - `logprobs` (integer)
  - `max_tokens` (integer)
  - `n` (integer)
  - `presence_penalty` (number)
  - `seed` (integer)
  - `stop` (array)
  - `suffix` (string)
  - `temperature` (number)
  - `top_p` (number)
  - `user` (string)
```

### Responses

#### 202
Job accepted for processing

#### 400
Bad request

#### 500
Internal server error

