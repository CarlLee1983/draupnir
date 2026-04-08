# Count tokens (Gemini format)

Counts tokens using Google Gemini API format.


## HTTP Request

`POST /genai/v1beta/models/{model}:countTokens`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| model | path | string | Model name with action (e.g., gemini-pro:countTokens) |

### Request Body

```yaml
Object
  - `contents` (array)
  - `generateContentRequest` (object)
```

### Responses

#### 200
Successful response

#### 400
Bad request

#### 500
Internal server error

