# Create async image generation

Submits an image generation request for asynchronous execution. Returns a job ID immediately
with HTTP 202. Poll the corresponding GET endpoint with the job ID to retrieve the result.
Streaming is not supported for async requests.


## HTTP Request

`POST /v1/async/images/generations`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| x-bf-async-job-result-ttl | header | integer | Time-to-live in seconds for the job result after completion. Defaults to 3600 (1 hour). After expiry, the job result is automatically cleaned up.  |

### Request Body

```yaml
any
```

### Responses

#### 202
Job accepted for processing

#### 400
Bad request

#### 500
Internal server error

