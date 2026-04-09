# Create a batch job

Creates a batch job for asynchronous processing.


## HTTP Request

`POST /v1/batches`

### Request Body

```yaml
Object
  - `model` (string) - Model in provider/model format
  - `input_file_id` (string) - OpenAI-style file ID
  - `requests` (array) - Anthropic-style inline requests
  - `endpoint` (string)
  - `completion_window` (string) - e.g., "24h"
  - `metadata` (object)
```

### Responses

#### 200
Successful response

#### 400
Bad request

#### 500
Internal server error

