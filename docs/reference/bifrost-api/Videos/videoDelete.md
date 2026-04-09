# Delete a video generation job

Deletes a video generation job and its associated assets.
This operation cannot be undone.


## HTTP Request

`DELETE /v1/videos/{video_id}`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| video_id | path | string | Video ID in format `id:provider` (e.g., `video_abc123:openai`) |

### Responses

#### 200
Successful response. Returns deletion confirmation.

#### 400
Bad request

#### 404
Video not found

#### 500
Internal server error

