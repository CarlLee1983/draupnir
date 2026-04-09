# Retrieve file metadata (OpenAI format)

Retrieves metadata for an uploaded file.

**Note:** This endpoint also works without the `/v1` prefix (e.g., `/openai/files/{file_id}`).


## HTTP Request

`GET /openai/v1/files/{file_id}`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| file_id | path | string | File ID |
| provider | query | string | Provider for the file |

### Responses

#### 200
Successful response

#### 400
Bad request

#### 500
Internal server error

