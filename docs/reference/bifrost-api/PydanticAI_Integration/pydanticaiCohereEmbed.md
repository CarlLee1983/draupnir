# Create embeddings (PydanticAI - Cohere format)

Creates embeddings using Cohere-compatible format via PydanticAI.


## HTTP Request

`POST /pydanticai/cohere/v2/embed`

### Request Body

```yaml
Object
  - `model` (string) - ID of an available embedding model
  - `input_type` (string) - Specifies the type of input passed to the model. Required for embedding models v3 and higher.
  - `texts` (array) - Array of strings to embed. Maximum 96 texts per call. At least one of texts, images, or inputs is required.
  - `images` (array) - Array of image data URIs for multimodal embedding. Maximum 1 image per call. Supports JPEG, PNG, WebP, GIF up to 5MB.
  - `inputs` (array) - Array of mixed text/image components for embedding. Maximum 96 per call.
  - `embedding_types` (array) - Specifies the return format types (float, int8, uint8, binary, ubinary, base64). Defaults to float if unspecified.
  - `output_dimension` (integer) - Number of dimensions for output embeddings (256, 512, 1024, 1536). Available only for embed-v4 and newer models.
  - `max_tokens` (integer) - Maximum tokens to embed per input before truncation.
  - `truncate` (string) - Handling for inputs exceeding token limits. Defaults to END.
```

### Responses

#### 200
Successful response

#### 400
Bad request

#### 500
Internal server error

