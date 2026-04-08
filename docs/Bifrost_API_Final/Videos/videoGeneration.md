# Generate a video

Creates a video generation job from a text prompt. This is an asynchronous operation
that returns immediately with a job ID. Use the retrieve endpoint to check the status
and get the video URL when generation is complete.


## HTTP Request

`POST /v1/videos`

### Request Body

```yaml
Object
  - `model` (string) - Model identifier in format `provider/model`
  - `prompt` (string) - Text prompt describing the video to generate
  - `input_reference` (string) - Optional reference image for image-to-video. OpenAI and Gemini require a base64 data URL (e.g., `data:image/png;base64,...`). Runway and Replicate accept both data URLs and plain URLs.
  - `seconds` (string) - Duration of the video in seconds as a string (e.g., "4")
  - `size` (string) - Resolution of the generated video (e.g., `1280x720`, `720x1280`, `1920x1080`)
  - `negative_prompt` (string) - Text describing what to avoid in the generated video
  - `seed` (integer) - Seed for reproducible generation
  - `video_uri` (string) - Source video URI for video-to-video generation (provider-specific, e.g. GCS URI)
  - `audio` (boolean) - Enable audio generation in the video (supported by select providers/models)
  - `fallbacks` (array) - Fallback models to try if primary model fails
```

### Responses

#### 200
Successful response. Returns a video generation job object with status information.
Poll the retrieve endpoint to check completion status.


#### 400
Bad request

#### 500
Internal server error

