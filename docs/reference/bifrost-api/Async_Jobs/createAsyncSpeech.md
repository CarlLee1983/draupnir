# Create async speech

Submits a speech synthesis request for asynchronous execution. Returns a job ID immediately
with HTTP 202. Poll the corresponding GET endpoint with the job ID to retrieve the result.
SSE streaming is not supported for async requests.


## HTTP Request

`POST /v1/async/audio/speech`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| x-bf-async-job-result-ttl | header | integer | Time-to-live in seconds for the job result after completion. Defaults to 3600 (1 hour). After expiry, the job result is automatically cleaned up.  |

### Request Body

```yaml
Object
  - `model` (string) - Model in provider/model format
  - `input` (string) - Text to convert to speech
  - `fallbacks` (array)
  - `stream_format` (string) - Set to "sse" to enable streaming
  - `voice` (any)
  - `instructions` (string)
  - `response_format` (string)
  - `speed` (number)
  - `language_code` (string)
  - `pronunciation_dictionary_locators` (array)
  - `enable_logging` (boolean)
  - `optimize_streaming_latency` (boolean)
  - `with_timestamps` (boolean)
```

### Responses

#### 202
Job accepted for processing

#### 400
Bad request

#### 500
Internal server error

