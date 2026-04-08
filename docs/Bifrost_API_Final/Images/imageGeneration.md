# Generate an image

Generates images from text prompts using the specified model.


## HTTP Request

`POST /v1/images/generations`

### Request Body

```yaml
any
```

### Responses

#### 200
Successful response. Returns JSON for non-streaming requests, or Server-Sent Events (SSE) stream when `stream=true`.
When streaming, events are sent with the following event types:
- `image_generation.partial_image`: Intermediate image chunks with base64-encoded image data
- `image_generation.completed`: Final event for each image with usage information
- `error`: Error events with error details


#### 400
Bad request

#### 500
Internal server error

