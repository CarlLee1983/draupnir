# Create async embedding

Submits an embedding request for asynchronous execution. Returns a job ID immediately
with HTTP 202. Poll the corresponding GET endpoint with the job ID to retrieve the result.


## HTTP Request

`POST /v1/async/embeddings`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| x-bf-async-job-result-ttl | header | integer | Time-to-live in seconds for the job result after completion. Defaults to 3600 (1 hour). After expiry, the job result is automatically cleaned up.  |

### Request Body

```yaml
Object
  - `model` (string) - Model in provider/model format
  - `input` (any) - Input for embedding - text or token arrays
  - `fallbacks` (array)
  - `encoding_format` (string)
  - `dimensions` (integer)
```

### Responses

#### 202
Job accepted for processing

#### 400
Bad request

#### 500
Internal server error

