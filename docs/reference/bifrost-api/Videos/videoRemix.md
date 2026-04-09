# Remix a video

Creates a new video generation job by remixing an existing video with a new prompt.
The source video must have a status of "completed" to be remixed.
Returns a new video generation job that can be polled for completion.


## HTTP Request

`POST /v1/videos/{video_id}/remix`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| video_id | path | string | Video ID in format `id:provider` (e.g., `video_abc123:openai`) |

### Request Body

```yaml
Object
  - `prompt` (string) - Text prompt describing how to remix the video
```

### Responses

#### 200
Successful response. Returns a new video generation job object.
Poll the retrieve endpoint to check completion status.


#### 400
Bad request

#### 404
Source video not found

#### 500
Internal server error

