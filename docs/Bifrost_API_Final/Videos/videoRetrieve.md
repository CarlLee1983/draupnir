# Retrieve a video generation job

Retrieves the status and metadata for a video generation job.
Use this endpoint to poll for completion status after creating a video generation job.
When the status is "completed", the response will include a URL to download the video.


## HTTP Request

`GET /v1/videos/{video_id}`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| video_id | path | string | Video ID in format `id:provider` (e.g., `video_abc123:openai`) |

### Responses

#### 200
Successful response. Returns the video generation job details.

#### 400
Bad request

#### 404
Video not found

#### 500
Internal server error

