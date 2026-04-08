# Create container (OpenAI format)

Creates a new container for storing files and data.

**Note:** This endpoint also works without the `/v1` prefix (e.g., `/openai/containers`).


## HTTP Request

`POST /openai/v1/containers`

### Request Body

```yaml
Object
  - `provider` (string) - AI model provider identifier
  - `name` (string) - Name of the container
  - `expires_after` (object) - Expiration configuration for a container
  - `file_ids` (array) - IDs of existing files to copy into this container
  - `memory_limit` (string) - Memory limit for the container (e.g., "1g", "4g")
  - `metadata` (object) - User-provided metadata
```

### Responses

#### 200
Successful response

#### 400
Bad request

#### 500
Internal server error

