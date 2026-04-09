# Download video content

Downloads the binary content of a generated video.
The video must have a status of "completed" to be downloadable.
Returns the raw video file (typically MP4 format).


## HTTP Request

`GET /v1/videos/{video_id}/content`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| video_id | path | string | Video ID in format `id:provider` (e.g., `video_abc123:openai`) |
| variant | query | string | Variant of the video content to download (provider-specific) |

### Responses

#### 200
Successful response. Returns the video file as binary content.

#### 400
Bad request

#### 404
Video not found or not yet available

#### 500
Internal server error

