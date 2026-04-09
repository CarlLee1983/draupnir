# Get async image generation job

Retrieves the status and result of an async image generation job.
Returns HTTP 202 if the job is still pending or processing, HTTP 200 if completed or failed.


## HTTP Request

`GET /v1/async/images/generations/{job_id}`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| job_id | path | string | The unique identifier of the async job |

### Responses

#### 200
Job completed (successfully or with failure)

#### 202
Job is still pending or processing

#### 404
Job not found or expired

