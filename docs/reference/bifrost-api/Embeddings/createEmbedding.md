# Create embeddings

Creates an embedding vector representing the input text.


## HTTP Request

`POST /v1/embeddings`

### Request Body

```yaml
Object
  - `model` (string) - Model in provider/model format
  - `input` (any) - Input for embedding - text or token arrays
  - `fallbacks` (array)
  - `encoding_format` (string)
  - `dimensions` (integer)
```

### Responses

#### 200
Successful response

#### 400
Bad request

#### 500
Internal server error

