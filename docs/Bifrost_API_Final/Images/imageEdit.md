# Edit an image

Edits an image using a text prompt and optional mask. Request must be sent as multipart/form-data
with at least `model`, `prompt` (unless `type` is `background_removal`), and `image` (or `image[]`).


## HTTP Request

`POST /v1/images/edits`

### Request Body

### Responses

#### 200
Successful response. Returns JSON for non-streaming requests, or Server-Sent Events (SSE) stream when `stream=true`.
When streaming, events are sent with the following event types:
- `image_edit.partial_image`: Intermediate image chunks with base64-encoded image data
- `image_edit.completed`: Final event for each image with usage information
- `error`: Error events with error details


#### 400
Bad request

#### 500
Internal server error

