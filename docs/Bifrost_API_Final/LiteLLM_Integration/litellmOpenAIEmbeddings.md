# Create embeddings (LiteLLM - OpenAI format)

Creates embeddings using OpenAI-compatible format via LiteLLM.


## HTTP Request

`POST /litellm/v1/embeddings`

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

