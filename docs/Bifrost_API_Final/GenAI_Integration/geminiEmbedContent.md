# Embed content (Gemini format)

Creates embeddings using Google Gemini API format.


## HTTP Request

`POST /genai/v1beta/models/{model}:embedContent`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| model | path | string | Model name with action (e.g., embedding-001:embedContent) |

### Request Body

```yaml
Object
  - `model` (string)
  - `content` (object)
  - `taskType` (string)
  - `title` (string)
  - `outputDimensionality` (integer)
```

### Responses

#### 200
Successful response

#### 400
Bad request

#### 500
Internal server error

