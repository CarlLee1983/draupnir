# Create embeddings (OpenAI format)

Creates embedding vectors for the input text.

**Note:** This endpoint also works without the `/v1` prefix (e.g., `/openai/embeddings`).


## HTTP Request

`POST /openai/v1/embeddings`

### Request Body

```yaml
Object
  - `model` (string) - Model identifier
  - `input` (any) - Input text to embed
  - `encoding_format` (string)
  - `dimensions` (integer) - Number of dimensions for the embedding
  - `user` (string)
  - `fallbacks` (array)
```

### Responses

#### 200
Successful response

#### 400
Bad request

#### 500
Internal server error

